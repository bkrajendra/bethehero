import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getDonorByEmail, linkDonorToAuthUser } from "@/lib/db/queries/donors";
import { getAdminByAuthUserId } from "@/lib/db/queries/admins";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/status";
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");

  // Supabase sends error params (not a code) when OAuth fails e.g. duplicate account
  if (errorCode && !code) {
    const loginPage = next.startsWith("/admin") ? "/admin/login" : "/login";
    const isDuplicate = (searchParams.get("error_description") ?? "").toLowerCase().includes("multiple");
    const errorParam = isDuplicate ? "duplicate_account" : "auth_failed";
    return NextResponse.redirect(`${origin}${loginPage}?error=${errorParam}`);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginPage = next.startsWith("/admin") ? "/admin/login" : "/login";
      return NextResponse.redirect(`${origin}${loginPage}?error=auth_failed`);
    }

    if (user?.email) {
      // Only route to admin if the login was initiated from the admin context
      if (next.startsWith("/admin")) {
        const admin = await getAdminByAuthUserId(user.id);
        if (admin?.active) {
          return NextResponse.redirect(`${origin}/admin`);
        }
      }

      const donor = await getDonorByEmail(user.email);
      if (donor) {
        if (!donor.authUserId) {
          await linkDonorToAuthUser(donor.id, user.id);
        }
      } else {
        // No donor record — send to registration with email pre-filled
        const registerUrl = new URL(`${origin}/register`);
        registerUrl.searchParams.set("email", user.email);
        const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";
        if (name) registerUrl.searchParams.set("name", name);
        return NextResponse.redirect(registerUrl.toString());
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
