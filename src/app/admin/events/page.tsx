import { getAllEvents, getAppSettings } from "@/lib/db/queries/events";
import { requireAdmin } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";
import { CreateEventDialog } from "./CreateEventDialog";
import { setActiveEventAction, activateEventAction, closeEventAction } from "./actions";

async function setActiveVoid(id: string) { "use server"; await setActiveEventAction(id); }
async function activateVoid(id: string) { "use server"; await activateEventAction(id); }
async function closeVoid(id: string) { "use server"; await closeEventAction(id); }

export default async function EventsPage() {
  await requireAdmin();
  const [events, settings] = await Promise.all([getAllEvents(), getAppSettings()]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Events</h1>
        <CreateEventDialog />
      </div>

      <div className="space-y-3">
        {events.map(event => (
          <div key={event.id} className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{event.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize
                  ${event.status === "active" ? "bg-green-500/20 text-green-300" :
                    event.status === "draft"  ? "bg-yellow-500/20 text-yellow-300" :
                    "bg-gray-500/20 text-gray-400"}`}>
                  {event.status}
                </span>
                {event.id === settings?.currentEventId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(200,16,46,0.2)] text-[#ff2442]">
                    Public Drive
                  </span>
                )}
              </div>
              <p className="text-sm text-[rgba(253,240,238,0.55)]">{event.venue}</p>
              <p className="text-xs text-[rgba(253,240,238,0.3)]">
                {new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {event.id !== settings?.currentEventId && (
                <form action={setActiveVoid.bind(null, event.id)}>
                  <Button variant="outline" size="sm" className="border-[rgba(200,16,46,0.3)] text-[rgba(253,240,238,0.7)]">
                    Set as Active Drive
                  </Button>
                </form>
              )}
              {event.status === "draft" && (
                <form action={activateVoid.bind(null, event.id)}>
                  <Button size="sm" className="bg-[#c8102e] hover:bg-[#ff2442]">Activate</Button>
                </form>
              )}
              {event.status === "active" && (
                <form action={closeVoid.bind(null, event.id)}>
                  <Button variant="destructive" size="sm">Close</Button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
