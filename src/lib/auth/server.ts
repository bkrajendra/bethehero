import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getDonorByAuthUserId } from "@/lib/db/queries/donors";
import { getAdminByAuthUserId } from "@/lib/db/queries/admins";

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
            // called from a Server Component
          }
        },
      },
    },
  );
}

export async function requireDonor() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const donor = await getDonorByAuthUserId(user.id);
  if (!donor) {
    throw new Response("Donor not found", { status: 401 });
  }
  return { donorId: donor.id, authUserId: user.id, email: user.email!, donor };
}

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const admin = await getAdminByAuthUserId(user.id);
  if (!admin || !admin.active) {
    throw new Response("Forbidden", { status: 403 });
  }
  return { adminId: admin.id, authUserId: user.id, email: user.email!, admin };
}
