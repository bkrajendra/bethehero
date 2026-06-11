"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/server";
import { createEvent, updateEvent, setActiveEvent } from "@/lib/db/queries/events";
import { writeAuditLog } from "@/lib/db/queries/audit";

const EventSchema = z.object({
  name:                      z.string().min(3),
  venue:                     z.string().min(3),
  address:                   z.string().min(5),
  startAt:                   z.string().min(1),
  endAt:                     z.string().min(1),
  organiserName:             z.string().min(2),
  bloodBankName:             z.string().min(2),
  organiserSignatoryName:    z.string().min(2),
  organiserSignatoryTitle:   z.string().min(2),
  bloodBankSignatoryName:    z.string().min(2),
  bloodBankSignatoryTitle:   z.string().min(2),
});

export async function createEventAction(formData: FormData) {
  const { adminId } = await requireAdmin();
  const parsed = EventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const event = await createEvent({
    ...parsed.data,
    startAt: new Date(parsed.data.startAt),
    endAt: new Date(parsed.data.endAt),
    status: "draft",
  });
  await writeAuditLog({ actorAdminId: adminId, action: "create_event", targetTable: "events", targetId: event.id });
  revalidatePath("/admin/events");
  return { success: true, eventId: event.id };
}

export async function setActiveEventAction(eventId: string) {
  const { adminId } = await requireAdmin();
  await setActiveEvent(eventId);
  await writeAuditLog({ actorAdminId: adminId, action: "set_active_event", targetTable: "events", targetId: eventId });
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  return { success: true };
}

export async function activateEventAction(eventId: string) {
  const { adminId } = await requireAdmin();
  await updateEvent(eventId, { status: "active" });
  await writeAuditLog({ actorAdminId: adminId, action: "activate_event", targetTable: "events", targetId: eventId });
  revalidatePath("/admin/events");
  return { success: true };
}

export async function closeEventAction(eventId: string) {
  const { adminId } = await requireAdmin();
  await updateEvent(eventId, { status: "closed" });
  await writeAuditLog({ actorAdminId: adminId, action: "close_event", targetTable: "events", targetId: eventId });
  revalidatePath("/admin/events");
  return { success: true };
}
