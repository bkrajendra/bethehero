import { requireAdmin } from "@/lib/auth/server";
import { getAppSettings } from "@/lib/db/queries/events";
import { getAttendeesByEvent } from "@/lib/db/queries/attendees";
import { checkInAction, markDonatedAction, markDeferredAction, markNoShowAction } from "./actions";
import { Button } from "@/components/ui/button";

async function checkInVoid(fd: FormData) { "use server"; await checkInAction(fd); }
async function donatedVoid(fd: FormData) { "use server"; await markDonatedAction(fd); }
async function deferredVoid(fd: FormData) { "use server"; await markDeferredAction(fd); }
async function noShowVoid(fd: FormData) { "use server"; await markNoShowAction(fd); }

const STATUS_COLORS: Record<string, string> = {
  registered: "bg-blue-500/20 text-blue-300",
  confirmed:  "bg-yellow-500/20 text-yellow-300",
  checked_in: "bg-orange-500/20 text-orange-300",
  donated:    "bg-green-500/20 text-green-300",
  deferred:   "bg-red-500/20 text-red-300",
  no_show:    "bg-gray-500/20 text-gray-400",
};

export default async function AttendeesPage() {
  await requireAdmin();
  const settings = await getAppSettings();
  if (!settings?.currentEventId) {
    return <div className="text-[rgba(253,240,238,0.55)]">No active event. Set one in the Events tab.</div>;
  }

  const attendees = await getAttendeesByEvent(settings.currentEventId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Attendees</h1>
        <span className="text-sm text-[rgba(253,240,238,0.3)]">{attendees.length} total</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[rgba(200,16,46,0.2)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[rgba(200,16,46,0.2)]">
            <tr>
              {["Name", "Company", "Blood Group", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[rgba(253,240,238,0.3)] font-medium text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attendees.map(a => (
              <tr key={a.id} className="border-b border-[rgba(200,16,46,0.08)] hover:bg-[rgba(200,16,46,0.04)]">
                <td className="px-4 py-3 font-medium text-[#fdf0ee]">{a.donor?.fullName ?? "—"}</td>
                <td className="px-4 py-3 text-[rgba(253,240,238,0.55)]">{a.donor?.company ?? "—"}</td>
                <td className="px-4 py-3 text-[rgba(253,240,238,0.55)]">{a.bloodGroupAtEvent ?? a.donor?.bloodGroup ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[a.status]}`}>
                    {a.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {(a.status === "registered" || a.status === "confirmed") && (
                      <form action={checkInVoid}>
                        <input type="hidden" name="attendeeId" value={a.id} />
                        <Button size="sm" type="submit" className="bg-[#c8102e] hover:bg-[#ff2442] h-7 text-xs">Check In</Button>
                      </form>
                    )}
                    {a.status === "checked_in" && (
                      <form action={donatedVoid}>
                        <input type="hidden" name="attendeeId" value={a.id} />
                        <Button size="sm" type="submit" className="bg-green-600 hover:bg-green-500 h-7 text-xs">Mark Donated</Button>
                      </form>
                    )}
                    {!["donated", "deferred", "no_show"].includes(a.status) && (
                      <>
                        <form action={deferredVoid}>
                          <input type="hidden" name="attendeeId" value={a.id} />
                          <Button size="sm" variant="outline" type="submit" className="border-yellow-500/30 text-yellow-300 h-7 text-xs">Defer</Button>
                        </form>
                        <form action={noShowVoid}>
                          <input type="hidden" name="attendeeId" value={a.id} />
                          <Button size="sm" variant="outline" type="submit" className="border-gray-500/30 text-gray-400 h-7 text-xs">No-Show</Button>
                        </form>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
