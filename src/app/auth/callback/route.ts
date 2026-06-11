import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getDonorByEmail, linkDonorToAuthUser } from "@/lib/db/queries/donors";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/status";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user?.email) {
      const donor = await getDonorByEmail(user.email);
      if (donor && !donor.authUserId) {
        await linkDonorToAuthUser(donor.id, user.id);
      }
    } else if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
