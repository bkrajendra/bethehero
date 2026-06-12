import { getAllEvents, getAppSettings } from "@/lib/db/queries/events";
import { requireAdmin } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";
import { CreateEventDialog } from "./CreateEventDialog";
import { EditEventDialog } from "./EditEventDialog";
import { setActiveEventAction, activateEventAction, closeEventAction } from "./actions";

async function setActiveVoid(id: string) { "use server"; await setActiveEventAction(id); }
async function activateVoid(id: string) { "use server"; await activateEventAction(id); }
async function closeVoid(id: string) { "use server"; await closeEventAction(id); }

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-600 border border-green-200",
  draft:  "bg-yellow-50 text-yellow-600 border border-yellow-200",
  closed: "bg-gray-50 text-gray-400 border border-gray-200",
};

export default async function EventsPage() {
  await requireAdmin();
  const [events, settings] = await Promise.all([getAllEvents(), getAppSettings()]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-400 mt-1">{events.length} events</p>
        </div>
        <CreateEventDialog />
      </div>

      <div className="space-y-3">
        {events.map(event => (
          <div key={event.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{event.name}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[event.status] ?? "bg-gray-50 text-gray-400 border border-gray-200"}`}>
                    {event.status}
                  </span>
                  {event.id === settings?.currentEventId && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-red-50 text-[#c8102e] border border-red-100">
                      Active Drive
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{event.venue} — {event.address}</p>
                <p className="text-xs text-gray-400">
                  {new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                  {" · "}
                  {new Date(event.startAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                  {" – "}
                  {new Date(event.endAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap shrink-0">
                <EditEventDialog event={event} />
                {event.id !== settings?.currentEventId && (
                  <form action={setActiveVoid.bind(null, event.id)}>
                    <Button variant="outline" size="sm" className="border-gray-200 text-gray-600 hover:bg-gray-50">
                      Set as Active
                    </Button>
                  </form>
                )}
                {event.status === "draft" && (
                  <form action={activateVoid.bind(null, event.id)}>
                    <Button size="sm" className="bg-[#c8102e] hover:bg-[#a50d27] text-white">Activate</Button>
                  </form>
                )}
                {event.status === "active" && (
                  <form action={closeVoid.bind(null, event.id)}>
                    <Button variant="destructive" size="sm">Close</Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
