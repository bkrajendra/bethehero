import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { eventAttendees } from "../schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Attendee = InferSelectModel<typeof eventAttendees>;
export type NewAttendee = InferInsertModel<typeof eventAttendees>;

export async function getAttendeeByBadgeToken(token: string) {
  return db.query.eventAttendees.findFirst({
    where: eq(eventAttendees.badgeToken, token),
    with: { donor: true, event: true },
  });
}

export async function getAttendeeByDonorAndEvent(donorId: string, eventId: string) {
  return db.query.eventAttendees.findFirst({
    where: and(
      eq(eventAttendees.donorId, donorId),
      eq(eventAttendees.eventId, eventId),
    ),
  });
}

export async function getAttendeeById(id: string) {
  return db.query.eventAttendees.findFirst({
    where: eq(eventAttendees.id, id),
    with: { donor: true, event: true },
  });
}

export async function getAttendeesByDonor(donorId: string) {
  return db.query.eventAttendees.findMany({
    where: eq(eventAttendees.donorId, donorId),
    with: { event: true },
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });
}

export async function getAttendeesByEvent(eventId: string) {
  return db.query.eventAttendees.findMany({
    where: eq(eventAttendees.eventId, eventId),
    with: { donor: true },
    orderBy: (a, { asc }) => [asc(a.createdAt)],
  });
}

export async function createAttendee(data: NewAttendee) {
  const [attendee] = await db.insert(eventAttendees).values(data).returning();
  return attendee;
}

export async function updateAttendee(id: string, data: Partial<NewAttendee>) {
  const [updated] = await db
    .update(eventAttendees)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(eventAttendees.id, id))
    .returning();
  return updated;
}
