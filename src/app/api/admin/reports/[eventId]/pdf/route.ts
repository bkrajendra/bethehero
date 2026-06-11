import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/server";
import { getEventById } from "@/lib/db/queries/events";
import { getAttendeesByEvent } from "@/lib/db/queries/attendees";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyReactElement = import("react").ReactElement<any, any>;
import { EventReportPDF } from "@/lib/reports/pdf";
import { computeKPIs } from "@/lib/reports/kpis";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    await requireAdmin();
    const { eventId } = await params;
    const event = await getEventById(eventId);
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const attendees = await getAttendeesByEvent(eventId);
    const kpis = computeKPIs(attendees);

    const bloodGroupMap: Record<string, number> = {};
    for (const a of attendees) {
      if (a.status === "donated" && a.bloodGroupAtEvent) {
        bloodGroupMap[a.bloodGroupAtEvent] = (bloodGroupMap[a.bloodGroupAtEvent] ?? 0) + 1;
      }
    }

    const buffer = await renderToBuffer(
      createElement(EventReportPDF, {
        eventName: event.name,
        venue: event.venue ?? "",
        date: new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        kpis,
        bloodGroups: Object.entries(bloodGroupMap).map(([name, value]) => ({ name, value })),
      }) as AnyReactElement,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${event.name.replace(/\s+/g,"-")}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api] unexpected error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
