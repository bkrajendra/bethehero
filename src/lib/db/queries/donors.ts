import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { db } from "../index";
import { donors, eventAttendees, notificationJobs, pushSubscriptions, feedback } from "../schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Donor = InferSelectModel<typeof donors>;
export type NewDonor = InferInsertModel<typeof donors>;

export async function getDonorByEmail(email: string) {
  return db.query.donors.findFirst({
    where: and(eq(donors.email, email.toLowerCase()), isNull(donors.deletedAt)),
  });
}

export async function getDonorByAuthUserId(authUserId: string) {
  return db.query.donors.findFirst({
    where: and(eq(donors.authUserId, authUserId), isNull(donors.deletedAt)),
  });
}

export async function getDonorById(id: string) {
  return db.query.donors.findFirst({ where: eq(donors.id, id) });
}

export async function createDonor(data: NewDonor) {
  const [donor] = await db.insert(donors).values(data).returning();
  return donor;
}

export async function upsertDonorByEmail(data: NewDonor): Promise<{ donor: Donor; created: boolean }> {
  const [inserted] = await db
    .insert(donors)
    .values(data)
    .onConflictDoNothing({ target: donors.email })
    .returning();

  if (inserted) return { donor: inserted, created: true };

  const existing = await db.query.donors.findFirst({ where: eq(donors.email, data.email as string) });
  return { donor: existing!, created: false };
}

export async function linkDonorToAuthUser(donorId: string, authUserId: string) {
  await db
    .update(donors)
    .set({ authUserId, emailVerified: true, updatedAt: new Date() })
    .where(eq(donors.id, donorId));
}

export async function updateDonorProfile(
  donorId: string,
  data: Pick<Donor, "fullName" | "mobile" | "gender" | "company" | "bloodGroup" | "dob">,
) {
  const [updated] = await db
    .update(donors)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(donors.id, donorId))
    .returning();
  return updated;
}

export async function softDeleteDonor(donorId: string) {
  await db.update(donors).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(donors.id, donorId));
}

export async function restoreDonor(donorId: string) {
  await db.update(donors).set({ deletedAt: null, updatedAt: new Date() }).where(eq(donors.id, donorId));
}

/** Hard-delete a donor and all their history. Call only for already soft-deleted donors. */
export async function hardDeleteDonor(donorId: string) {
  // Delete cascade order: notification_jobs → feedback → event_attendees → push_subscriptions → donor
  const attendeeRows = await db
    .select({ id: eventAttendees.id })
    .from(eventAttendees)
    .where(eq(eventAttendees.donorId, donorId));
  const attendeeIds = attendeeRows.map(r => r.id);

  for (const aid of attendeeIds) {
    await db.delete(notificationJobs).where(eq(notificationJobs.attendeeId, aid));
    await db.delete(feedback).where(eq(feedback.attendeeId, aid));
  }
  await db.delete(eventAttendees).where(eq(eventAttendees.donorId, donorId));
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.donorId, donorId));
  await db.delete(donors).where(eq(donors.id, donorId));
}

/** Hard-delete ALL soft-deleted donors and their history. */
export async function cleanupAllDeletedDonors() {
  const deleted = await db
    .select({ id: donors.id })
    .from(donors)
    .where(isNotNull(donors.deletedAt));
  for (const { id } of deleted) {
    await hardDeleteDonor(id);
  }
  return deleted.length;
}
