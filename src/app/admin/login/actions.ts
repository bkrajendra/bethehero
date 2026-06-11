"use server";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getAdminByEmail } from "@/lib/db/queries/admins";
import { db } from "@/lib/db/index";
import { admins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function sendAdminOtp(email: string): Promise<{ error?: string }> {
  const normalised = email.toLowerCase().trim();
  const admin = await getAdminByEmail(normalised);
  if (!admin || !admin.active) return { error: "Not authorised. Contact your administrator." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalised,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/admin` },
  });
  if (error) return { error: error.message };
  return {};
}

export async function verifyAdminOtp(email: string, token: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !user) return { error: error?.message ?? "Invalid code" };

  const admin = await getAdminByEmail(email);
  if (admin && admin.authUserId === "00000000-0000-0000-0000-000000000000") {
    await db.update(admins).set({ authUserId: user.id }).where(eq(admins.id, admin.id));
  }
  return {};
}
