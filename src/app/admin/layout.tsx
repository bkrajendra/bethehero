import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getAdminByAuthUserId } from "@/lib/db/queries/admins";
import { getAllEvents, getAppSettings } from "@/lib/db/queries/events";
import { AdminSidebar } from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const admin = await getAdminByAuthUserId(user.id);
  if (!admin || !admin.active) redirect("/admin/login");

  const [events, settings] = await Promise.all([getAllEvents(), getAppSettings()]);

  return (
    <div className="flex h-screen bg-[#070108] text-[#fdf0ee]">
      <AdminSidebar admin={admin} events={events} currentEventId={settings?.currentEventId ?? null} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
