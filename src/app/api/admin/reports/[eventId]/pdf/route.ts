import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { getEventById } from "@/lib/db/queries/events";
import { getAttendeesByEvent } from "@/lib/db/queries/attendees";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToBuffer } = require("@react-pdf/renderer") as { renderToBuffer: (el: unknown) => Promise<Buffer> };
import { createElement } from "react";
import { EventReportPDF } from "@/lib/reports/pdf";

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

    const bloodGroupMap: Record<string, number> = {};
    for (const a of attendees) {
      if (a.status === "donated" && a.bloodGroupAtEvent) {
        bloodGroupMap[a.bloodGroupAtEvent] = (bloodGroupMap[a.bloodGroupAtEvent] ?? 0) + 1;
      }
    }

    const buffer = await renderToBuffer(
      createElement(EventReportPDF, {
        eventName: event.name,
        venue: event.venue,
        date: new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        kpis: {
          registered: total,
          checkedIn:  statusCounts["checked_in"] ?? 0,
          donated,
          deferred:   statusCounts["deferred"]   ?? 0,
          noShow:     statusCounts["no_show"]    ?? 0,
          conversionPct: total > 0 ? Math.round((donated / total) * 100) : 0,
        },
        bloodGroups: Object.entries(bloodGroupMap).map(([name, value]) => ({ name, value })),
      }),
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${event.name.replace(/\s+/g,"-")}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
