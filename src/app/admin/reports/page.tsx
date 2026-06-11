import { requireAdmin } from "@/lib/auth/server";
import { getAllEvents } from "@/lib/db/queries/events";

export default async function ReportsPage() {
  await requireAdmin();
  const events = await getAllEvents();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <p className="text-[rgba(253,240,238,0.55)] text-sm">
        Reports are generated in-memory on demand and streamed as downloads — nothing is stored.
      </p>
      <div className="space-y-3">
        {events.map(event => (
          <div key={event.id} className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">{event.name}</p>
              <p className="text-sm text-[rgba(253,240,238,0.55)]">{event.venue}</p>
              <p className="text-xs text-[rgba(253,240,238,0.3)]">
                {new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href={`/api/admin/reports/${event.id}/xlsx`}
                download
                className="inline-flex items-center px-3 py-1.5 text-sm border border-[rgba(200,16,46,0.3)] text-[rgba(253,240,238,0.7)] rounded-md hover:bg-[rgba(200,16,46,0.08)] transition-colors"
              >
                Download Excel
              </a>
              <a
                href={`/api/admin/reports/${event.id}/pdf`}
                download
                className="inline-flex items-center px-3 py-1.5 text-sm bg-[#c8102e] text-white rounded-md hover:bg-[#ff2442] transition-colors"
              >
                Download PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
