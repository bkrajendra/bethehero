import { requireAdmin } from "@/lib/auth/server";
import { getAllEvents } from "@/lib/db/queries/events";

export default async function ReportsPage() {
  await requireAdmin();
  const events = await getAllEvents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-400 mt-1">
          Generated on demand — nothing is stored.
        </p>
      </div>
      <div className="space-y-3">
        {events.map(event => (
          <div key={event.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <p className="font-semibold text-gray-900">{event.name}</p>
              <p className="text-sm text-gray-500">{event.venue}</p>
              <p className="text-xs text-gray-400">
                {new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <a
                href={`/api/admin/reports/${event.id}/xlsx`}
                download
                className="inline-flex items-center px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Excel
              </a>
              <a
                href={`/api/admin/reports/${event.id}/pdf`}
                download
                className="inline-flex items-center px-4 py-2 text-sm bg-[#c8102e] text-white rounded-lg hover:bg-[#a50d27] transition-colors font-medium"
              >
                PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
