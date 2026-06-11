import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getDonorByAuthUserId } from "@/lib/db/queries/donors";
import { getAdminByAuthUserId } from "@/lib/db/queries/admins";

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component — cookies can't be set there
          }
        },
      },
    },
  );
}

/** Resolves the calling donor from the Supabase session. Throws AuthError if not authenticated. */
export async function requireDonor() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AuthError(401, "Unauthorized");
  }
  const donor = await getDonorByAuthUserId(user.id);
  if (!donor) {
    throw new AuthError(401, "Donor not found");
  }
  return { donorId: donor.id, authUserId: user.id, email: user.email!, donor };
}

/** Resolves the calling admin from the Supabase session. Throws AuthError if not an active admin. */
export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AuthError(401, "Unauthorized");
  }
  const admin = await getAdminByAuthUserId(user.id);
  if (!admin || !admin.active) {
    throw new AuthError(403, "Forbidden");
  }
  return { adminId: admin.id, authUserId: user.id, email: user.email!, admin };
}
