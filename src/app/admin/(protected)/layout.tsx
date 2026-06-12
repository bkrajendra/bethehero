import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getAdminByAuthUserId } from "@/lib/db/queries/admins";
import { getAllEvents, getAppSettings } from "@/lib/db/queries/events";
import { AdminSidebar } from "@/components/AdminSidebar";
import { ToastProvider } from "@/components/admin/ToastProvider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const admin = await getAdminByAuthUserId(user.id);
  if (!admin || !admin.active) redirect("/admin/login");

  const [events, settings] = await Promise.all([getAllEvents(), getAppSettings()]);

  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <AdminSidebar admin={admin} events={events} currentEventId={settings?.currentEventId ?? null} />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
