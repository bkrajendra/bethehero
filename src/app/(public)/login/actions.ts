"use server";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getDonorByEmail, linkDonorToAuthUser } from "@/lib/db/queries/donors";

export async function signInWithProvider(
  provider: "google" | "github",
  next = "/status",
): Promise<{ url?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true,
    },
  });
  if (error) return { error: error.message };
  return { url: data.url };
}

export async function sendOtp(email: string): Promise<{ error?: string }> {
  if (!email || !email.includes("@")) return { error: "Invalid email" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/status`,
    },
  });
  if (error) return { error: error.message };
  return {};
}

export async function verifyOtp(email: string, token: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: error.message };

  // Link auth user to donor row if not already linked (OTP flow skips /auth/callback)
  if (data.user?.email) {
    const donor = await getDonorByEmail(data.user.email);
    if (donor && !donor.authUserId) {
      await linkDonorToAuthUser(donor.id, data.user.id);
    }
  }
  return {};
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const { redirect } = await import("next/navigation");
  redirect("/login");
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const { redirect } = await import("next/navigation");
  redirect("/admin/login");
}
