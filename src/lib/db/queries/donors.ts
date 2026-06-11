import { eq } from "drizzle-orm";
import { db } from "../index";
import { donors } from "../schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Donor = InferSelectModel<typeof donors>;
export type NewDonor = InferInsertModel<typeof donors>;

export async function getDonorByEmail(email: string) {
  return db.query.donors.findFirst({ where: eq(donors.email, email.toLowerCase()) });
}

export async function getDonorByAuthUserId(authUserId: string) {
  return db.query.donors.findFirst({ where: eq(donors.authUserId, authUserId) });
}

export async function getDonorById(id: string) {
  return db.query.donors.findFirst({ where: eq(donors.id, id) });
}

export async function createDonor(data: NewDonor) {
  const [donor] = await db.insert(donors).values(data).returning();
  return donor;
}

/** Insert a new donor, or return existing if email already exists (handles concurrent registration). */
export async function upsertDonorByEmail(data: NewDonor): Promise<{ donor: Donor; created: boolean }> {
  const [inserted] = await db
    .insert(donors)
    .values(data)
    .onConflictDoNothing({ target: donors.email })
    .returning();

  if (inserted) return { donor: inserted, created: true };

  // Row existed — fetch it
  const existing = await getDonorByEmail(data.email as string);
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
  data: Pick<Donor, "fullName" | "mobile" | "company" | "bloodGroup" | "dob">,
) {
  const [updated] = await db
    .update(donors)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(donors.id, donorId))
    .returning();
  return updated;
}
