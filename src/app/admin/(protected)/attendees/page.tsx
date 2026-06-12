import { requireAdmin } from "@/lib/auth/server";
import { getAppSettings } from "@/lib/db/queries/events";
import { getAttendeesByEvent } from "@/lib/db/queries/attendees";
import { AttendeesClient } from "./AttendeesClient";

export default async function AttendeesPage() {
  await requireAdmin();
  const settings = await getAppSettings();
  if (!settings?.currentEventId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No active event. Set one in the Events tab.</p>
      </div>
    );
  }

  const attendees = await getAttendeesByEvent(settings.currentEventId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendees</h1>
        <p className="text-sm text-gray-400 mt-1">{attendees.length} registered for this event</p>
      </div>
      <AttendeesClient attendees={attendees} />
    </div>
  );
}
