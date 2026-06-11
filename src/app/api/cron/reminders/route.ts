import { NextRequest, NextResponse } from "next/server";
import { and, eq, lte, gte } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { eventAttendees, events } from "@/lib/db/schema";
import {
  enqueueNotification,
  getPendingNotifications,
  markNotificationSent,
  markNotificationFailed,
} from "@/lib/db/queries/notifications";
import { sendEmail } from "@/lib/email/ses";
import { confirmationEmailHtml } from "@/lib/email/templates/confirmation";
import { reminderEmailHtml } from "@/lib/email/templates/reminder";
import { thankYouEmailHtml } from "@/lib/email/templates/thank-you";
import { feedbackRequestEmailHtml } from "@/lib/email/templates/feedback-request";
import { sendPushNotification } from "@/lib/push/send";
import { getPushSubscriptionsByDonor } from "@/lib/push/subscriptions";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bethehero.in";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Step 1: Enqueue reminder_day_before for tomorrow's attendees ──────────
  const now = new Date();
  const windowStart = new Date(now.getTime());
  const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const upcomingAttendees = await db.query.eventAttendees.findMany({
    where: and(
      eq(eventAttendees.status, "registered"),
    ),
    with: { event: true },
  });

  const tomorrow = upcomingAttendees.filter(
    (a) => a.event.status === "active" && a.event.startAt >= windowStart && a.event.startAt <= windowEnd,
  );

  for (const attendee of tomorrow) {
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

  // ── Step 2: Drain all pending notification jobs ───────────────────────────
  const pending = await getPendingNotifications();
  let sent = 0;
  let failed = 0;

  for (const job of pending) {
    const { attendee } = job;
    const { donor, event } = attendee;

    try {
      if (job.channel === "email") {
        let html = "";
        let subject = "";

        switch (job.type) {
          case "confirmation": {
            subject = `You're registered for ${event.name}!`;
            html = confirmationEmailHtml({
              fullName:        donor.fullName,
              eventName:       event.name,
              venue:           event.venue,
              address:         event.address,
              startAt:         event.startAt,
              badgeToken:      attendee.badgeToken,
              loginUrl:        `${APP_URL}/donor/dashboard`,
              instructionsDos:   (event.instructionsDos as string[] | null) ?? [],
              instructionsDonts: (event.instructionsDonts as string[] | null) ?? [],
              appUrl: APP_URL,
            });
            break;
          }
          case "reminder_day_before": {
            subject = `Reminder: ${event.name} is tomorrow!`;
            html = reminderEmailHtml({
              fullName:   donor.fullName,
              eventName:  event.name,
              venue:      event.venue,
              startAt:    event.startAt,
              badgeToken: attendee.badgeToken,
              appUrl:     APP_URL,
            });
            break;
          }
          case "thank_you": {
            subject = "Thank you for donating blood — you're a hero!";
            const certUrl = attendee.certificateNumber
              ? `${APP_URL}/certificate/${attendee.badgeToken}`
              : `${APP_URL}/donor/dashboard`;
            html = thankYouEmailHtml({
              fullName:       donor.fullName,
              eventName:      event.name,
              certificateUrl: certUrl,
              appUrl:         APP_URL,
            });
            break;
          }
          case "feedback_request": {
            subject = "How was your donation experience?";
            html = feedbackRequestEmailHtml({
              fullName:    donor.fullName,
              feedbackUrl: `${APP_URL}/feedback/${attendee.badgeToken}`,
            });
            break;
          }
          default:
            await markNotificationFailed(job.id, `Unknown job type: ${job.type}`);
            failed++;
            continue;
        }

        await sendEmail({ to: donor.email, subject, html });

      } else if (job.channel === "push") {
        const subscriptions = await getPushSubscriptionsByDonor(donor.id);
        if (subscriptions.length === 0) {
          await markNotificationSent(job.id);
          sent++;
          continue;
        }

        let title = "BeTheHero";
        let body = "";
        let url = `${APP_URL}/donor/dashboard`;

        switch (job.type) {
          case "confirmation":
            title = "Registration Confirmed!";
            body  = `You're registered for ${event.name}.`;
            url   = `${APP_URL}/badge/${attendee.badgeToken}`;
            break;
          case "reminder_day_before":
            title = "Donation Drive Tomorrow!";
            body  = `${event.name} is tomorrow at ${event.venue}. Don't forget!`;
            url   = `${APP_URL}/badge/${attendee.badgeToken}`;
            break;
          case "thank_you":
            title = "You're a Hero!";
            body  = "Thank you for donating blood. Download your certificate!";
            url   = `${APP_URL}/certificate/${attendee.badgeToken}`;
            break;
          case "feedback_request":
            title = "Share Your Experience";
            body  = "How was the donation drive? Take 2 mins to give feedback.";
            url   = `${APP_URL}/feedback/${attendee.badgeToken}`;
            break;
        }

        await Promise.all(
          subscriptions.map((sub) =>
            sendPushNotification({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, { title, body, url })
          )
        );
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

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    pendingCount: pending.length,
  });
}
