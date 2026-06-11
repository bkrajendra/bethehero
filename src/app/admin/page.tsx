import { requireAdmin } from "@/lib/auth/server";
import { getAppSettings } from "@/lib/db/queries/events";
import { DashboardClient } from "./DashboardClient";

export default async function AdminDashboard() {
  await requireAdmin();
  const settings = await getAppSettings();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {settings?.currentEventId
        ? <DashboardClient eventId={settings.currentEventId} />
        : <p className="text-[rgba(253,240,238,0.55)]">No active event. Set one in Events.</p>
      }
    </div>
  );
}
