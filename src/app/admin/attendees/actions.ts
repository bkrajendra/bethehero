"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/server";
import { getAttendeeById, adminUpdateAttendee } from "@/lib/db/queries/attendees";
import { enqueueNotification } from "@/lib/db/queries/notifications";
import { writeAuditLog } from "@/lib/db/queries/audit";
import { nanoid } from "nanoid";

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

    await enqueueNotification({
      attendeeId, type: "thank_you", channel: "email",
      scheduledAt: new Date(),
      dedupeKey: `thank-you-email-${attendeeId}`,
    });
    await enqueueNotification({
      attendeeId, type: "feedback_request", channel: "email",
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      dedupeKey: `feedback-email-${attendeeId}`,
    });

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
