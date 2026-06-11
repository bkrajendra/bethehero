import { NextRequest, NextResponse } from "next/server";
import { and, eq, lte, gte } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { eventAttendees, events } from "@/lib/db/schema";
import { enqueueNotification, getPendingNotifications, markNotificationSent, markNotificationFailed } from "@/lib/db/queries/notifications";
import { sendEmail, sendPush } from "@/lib/onesignal/client";
import { reminderEmailHtml } from "@/lib/email/templates/reminder";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bethehero.in";

function verifyCronSecret(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return false; // fail closed if not configured
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Step 1: Enqueue reminder_day_before for tomorrow's attendees ──────────
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const upcomingAttendees = await db.query.eventAttendees.findMany({
    where: and(
      eq(eventAttendees.status, "registered"),
    ),
    with: { event: true },
  });

  const tomorrow = upcomingAttendees.filter(
    (a) => a.event && a.event.status === "active" && a.event.startAt >= windowStart && a.event.startAt <= windowEnd,
  );

  for (const attendee of tomorrow) {
    if (!attendee.event) continue; // skip if event was deleted
    // email reminder
    await enqueueNotification({
      attendeeId:  attendee.id,
      type:        "reminder_day_before",
      channel:     "email",
      scheduledAt: now,
      dedupeKey:   `reminder-email-${attendee.id}`,
    });
    // push reminder
    await enqueueNotification({
      attendeeId:  attendee.id,
      type:        "reminder_day_before",
      channel:     "push",
      scheduledAt: now,
      dedupeKey:   `reminder-push-${attendee.id}`,
    });
  }

  // ── Step 2: Send reminder_day_before jobs (only type handled by cron) ──────
  const pending = await getPendingNotifications();
  let sent = 0;
  let failed = 0;

  for (const job of pending) {
    if (job.type !== "reminder_day_before") {
      // Confirmation, thank_you, feedback_request are sent directly at action time
      await markNotificationFailed(job.id, "Stale queued job — sent directly at action time");
      failed++;
      continue;
    }

    const { attendee } = job;
    if (!attendee || !attendee.donor || !attendee.event) {
      await markNotificationFailed(job.id, "Attendee, donor, or event was deleted");
      failed++;
      continue;
    }
    const { donor, event } = attendee;

    try {
      if (job.channel === "email") {
        await sendEmail({
          to: donor.email,
          subject: `Reminder: ${event.name} is tomorrow!`,
          html: reminderEmailHtml({
            fullName:   donor.fullName,
            eventName:  event.name,
            venue:      event.venue,
            startAt:    event.startAt,
            badgeToken: attendee.badgeToken,
            appUrl:     APP_URL,
          }),
        });
      } else if (job.channel === "push") {
        await sendPush({
          externalUserId: donor.id,
          title: "Donation Drive Tomorrow!",
          body:  `${event.name} is tomorrow at ${event.venue}. Don't forget!`,
          url:   `${APP_URL}/badge/${attendee.badgeToken}`,
        });
      }

      await markNotificationSent(job.id);
      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/reminders] Failed to send job ${job.id}:`, message);
      await markNotificationFailed(job.id, message);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, pendingCount: pending.length });
}
