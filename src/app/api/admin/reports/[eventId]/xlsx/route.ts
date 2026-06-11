import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { getEventById } from "@/lib/db/queries/events";
import { getAttendeesByEvent } from "@/lib/db/queries/attendees";
import { buildEventXlsx } from "@/lib/reports/xlsx";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    await requireAdmin();
    const { eventId } = await params;
    const event = await getEventById(eventId);
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const attendees = await getAttendeesByEvent(eventId);
    const statusCounts: Record<string, number> = {};
    for (const a of attendees) statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
    const total = attendees.length;
    const donated = statusCounts["donated"] ?? 0;

    const kpis = {
      registered: total,
      checkedIn:  statusCounts["checked_in"] ?? 0,
      donated,
      deferred:   statusCounts["deferred"]   ?? 0,
      noShow:     statusCounts["no_show"]    ?? 0,
      conversionPct: total > 0 ? Math.round((donated / total) * 100) : 0,
    };

    const buffer = await buildEventXlsx(event.name, attendees, kpis);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="report-${event.name.replace(/\s+/g,"-")}.xlsx"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
