"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/server";
import { getAttendeeById, adminUpdateAttendee } from "@/lib/db/queries/attendees";
import { writeAuditLog } from "@/lib/db/queries/audit";
import { nanoid } from "nanoid";
import { sendEmail } from "@/lib/onesignal/client";
import { thankYouEmailHtml } from "@/lib/email/templates/thank-you";
import { feedbackRequestEmailHtml } from "@/lib/email/templates/feedback-request";

const VALID_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"] as const;

export async function checkInAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const { adminId } = await requireAdmin();
    const attendeeId = z.string().uuid().parse(formData.get("attendeeId"));
    const bloodGroupRaw = formData.get("bloodGroup");
    const bloodGroup = bloodGroupRaw
      ? z.enum(VALID_GROUPS).parse(bloodGroupRaw)
      : null;

    const attendee = await getAttendeeById(attendeeId);
    if (!attendee) return { error: "Attendee not found" };
    if (!["registered","confirmed"].includes(attendee.status)) return { error: "Invalid status transition" };

    await adminUpdateAttendee(attendeeId, {
      status: "checked_in",
      checkedInAt: new Date(),
      checkedInBy: adminId,
      ...(bloodGroup ? { bloodGroupAtEvent: bloodGroup } : {}),
    });
    await writeAuditLog({ actorAdminId: adminId, action: "check_in", targetTable: "event_attendees", targetId: attendeeId });
    revalidatePath("/admin/attendees");
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function markDonatedAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const { adminId } = await requireAdmin();
    const attendeeId = z.string().uuid().parse(formData.get("attendeeId"));

    const attendee = await getAttendeeById(attendeeId);
    if (!attendee) return { error: "Attendee not found" };
    if (attendee.status !== "checked_in") return { error: "Attendee must be checked in before marking donated" };
    if (!attendee.bloodGroupAtEvent) return { error: "Blood group must be captured before marking donated" };

    const certificateNumber = `BTH-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;

    await adminUpdateAttendee(attendeeId, {
      status: "donated",
      donatedAt: new Date(),
      markedBy: adminId,
      certificateNumber,
      certificateIssuedAt: new Date(),
    });

    // Send thank-you and feedback emails immediately
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (attendee.donor?.email && attendee.event) {
      const certUrl = `${appUrl}/certificate/${attendee.id}`;
      const feedbackUrl = `${appUrl}/feedback/${attendeeId}`;
      sendEmail({
        to: attendee.donor.email,
        subject: "Thank you for donating blood — you're a hero!",
        html: thankYouEmailHtml({
          fullName: attendee.donor.fullName,
          eventName: attendee.event.name,
          certificateUrl: certUrl,
          appUrl,
        }),
      }).catch((err) => console.error("[markDonated] thank-you email failed:", err));
      sendEmail({
        to: attendee.donor.email,
        subject: "How was your donation experience?",
        html: feedbackRequestEmailHtml({ fullName: attendee.donor.fullName, feedbackUrl }),
      }).catch((err) => console.error("[markDonated] feedback email failed:", err));
    }

    await writeAuditLog({ actorAdminId: adminId, action: "mark_donated", targetTable: "event_attendees", targetId: attendeeId, metadata: { certificateNumber } });
    revalidatePath("/admin/attendees");
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function markDeferredAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const { adminId } = await requireAdmin();
    const attendeeId = z.string().uuid().parse(formData.get("attendeeId"));
    const reason = (formData.get("reason") as string) || null;
    const attendee = await getAttendeeById(attendeeId);
    if (!attendee) return { error: "Attendee not found" };
    if (["donated","deferred","no_show"].includes(attendee.status)) return { error: "Invalid status transition" };
    await adminUpdateAttendee(attendeeId, { status: "deferred", deferralReason: reason });
    await writeAuditLog({ actorAdminId: adminId, action: "mark_deferred", targetTable: "event_attendees", targetId: attendeeId });
    revalidatePath("/admin/attendees");
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function markNoShowAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const { adminId } = await requireAdmin();
    const attendeeId = z.string().uuid().parse(formData.get("attendeeId"));
    const attendee = await getAttendeeById(attendeeId);
    if (!attendee) return { error: "Attendee not found" };
    if (["donated","deferred","no_show"].includes(attendee.status)) return { error: "Invalid status transition" };
    await adminUpdateAttendee(attendeeId, { status: "no_show" });
    await writeAuditLog({ actorAdminId: adminId, action: "mark_no_show", targetTable: "event_attendees", targetId: attendeeId });
    revalidatePath("/admin/attendees");
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}
