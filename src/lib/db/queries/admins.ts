import { eq } from "drizzle-orm";
import { db } from "../index";
import { admins } from "../schema";
import type { InferSelectModel } from "drizzle-orm";

export type Admin = InferSelectModel<typeof admins>;

export async function getAdminByEmail(email: string) {
  return db.query.admins.findFirst({ where: eq(admins.email, email.toLowerCase()) });
}

export async function getAdminByAuthUserId(authUserId: string) {
  return db.query.admins.findFirst({ where: eq(admins.authUserId, authUserId) });
}
