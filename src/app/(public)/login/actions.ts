"use server";
import { createSupabaseServerClient } from "@/lib/auth/server";

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
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: error.message };
  return {};
}
