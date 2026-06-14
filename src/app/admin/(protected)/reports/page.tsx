import { requireAdmin } from "@/lib/auth/server";
import { getAllEvents } from "@/lib/db/queries/events";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
          <Card key={event.id}>
            <CardContent className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-5">
              <div>
                <p className="font-semibold text-gray-900">{event.name}</p>
                <p className="text-sm text-gray-500">{event.venue}</p>
                <p className="text-xs text-gray-400">
                  {new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Button variant="outline" render={
                  <a href={`/api/admin/reports/${event.id}/xlsx`} download />
                }>
                  Excel
                </Button>
                <Button className="bg-[#c8102e] hover:bg-[#a50d27] text-white" render={
                  <a href={`/api/admin/reports/${event.id}/pdf`} download />
                }>
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
