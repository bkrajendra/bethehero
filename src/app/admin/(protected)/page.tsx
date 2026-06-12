import { requireAdmin } from "@/lib/auth/server";
import { getAppSettings } from "@/lib/db/queries/events";
import { DashboardClient } from "./DashboardClient";

export default async function AdminDashboard() {
  await requireAdmin();
  const settings = await getAppSettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Live event stats</p>
      </div>
      {settings?.currentEventId
        ? <DashboardClient eventId={settings.currentEventId} />
        : <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
            <p className="text-gray-400">No active event. Set one in the Events tab.</p>
          </div>
      }
    </div>
  );
}
