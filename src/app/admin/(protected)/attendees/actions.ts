"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/server";
import { getAttendeeById, getAttendeeByDonorAndEvent, adminUpdateAttendee, createAttendee } from "@/lib/db/queries/attendees";
import { getDonorByEmail, createDonor } from "@/lib/db/queries/donors";
import { getAppSettings } from "@/lib/db/queries/events";
import { writeAuditLog } from "@/lib/db/queries/audit";
import { nanoid } from "nanoid";
import { sendEmail } from "@/lib/onesignal/client";
import { thankYouEmailHtml } from "@/lib/email/templates/thank-you";
import { feedbackRequestEmailHtml } from "@/lib/email/templates/feedback-request";

const VALID_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"] as const;

export async function addDonorToEventAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const { adminId } = await requireAdmin();
    const settings = await getAppSettings();
    if (!settings?.currentEventId) return { error: "No active event" };

    const email = z.string().email().parse((formData.get("email") as string)?.toLowerCase().trim());
    const fullName = z.string().min(2).parse(formData.get("fullName") as string);
    const mobile = z.string().min(6).parse(formData.get("mobile") as string);
    const bloodGroupRaw = formData.get("bloodGroup") as string;
    const bloodGroup = bloodGroupRaw ? z.enum(VALID_GROUPS).parse(bloodGroupRaw) : null;

    let donor = await getDonorByEmail(email);
    if (!donor) {
      donor = await createDonor({
        email,
        fullName,
        mobile,
        bloodGroup: bloodGroup ?? undefined,
        consentGiven: true,
        consentAt: new Date(),
        consentVersion: "v1.0",
      });
    }

    const existing = await getAttendeeByDonorAndEvent(donor.id, settings.currentEventId);
    if (existing) return { error: "Donor is already registered for this event" };

    await createAttendee({
      eventId: settings.currentEventId,
      donorId: donor.id,
      badgeToken: nanoid(24),
      status: "registered",
    });

    await writeAuditLog({ actorAdminId: adminId, action: "add_donor_to_event", targetTable: "event_attendees", targetId: donor.id });
    revalidatePath("/admin/attendees");
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Failed" };
  }
}

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

    // Use provided blood group, or fall back to donor's profile blood group
    const effectiveBloodGroup = bloodGroup ?? (attendee.donor?.bloodGroup ?? null);

    await adminUpdateAttendee(attendeeId, {
      status: "checked_in",
      checkedInAt: new Date(),
      checkedInBy: adminId,
      ...(effectiveBloodGroup ? { bloodGroupAtEvent: effectiveBloodGroup } : {}),
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
    // Fall back to donor's profile blood group if not captured at check-in
    const bloodGroupAtEvent = attendee.bloodGroupAtEvent ?? attendee.donor?.bloodGroup ?? null;
    if (!bloodGroupAtEvent) return { error: "Blood group must be captured before marking donated" };

    const certificateNumber = `BTH-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;

    await adminUpdateAttendee(attendeeId, {
      status: "donated",
      donatedAt: new Date(),
      markedBy: adminId,
      certificateNumber,
      certificateIssuedAt: new Date(),
      bloodGroupAtEvent,
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
