import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db/index";
import { eventAttendees } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    await requireAdmin();
    const { eventId } = await params;

    const statusCounts = await db
      .select({
        status: eventAttendees.status,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId))
      .groupBy(eventAttendees.status);

    const bloodGroupCounts = await db
      .select({
        bloodGroup: eventAttendees.bloodGroupAtEvent,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(eventAttendees)
      .where(
        and(
          eq(eventAttendees.eventId, eventId),
          eq(eventAttendees.status, "donated"),
        ),
      )
      .groupBy(eventAttendees.bloodGroupAtEvent);

    const regOverTime = await db
      .select({
        day: sql<string>`date_trunc('hour', ${eventAttendees.createdAt})::text`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId))
      .groupBy(sql`date_trunc('hour', ${eventAttendees.createdAt})`)
      .orderBy(sql`date_trunc('hour', ${eventAttendees.createdAt})`);

    const counts: Record<string, number> = {};
    for (const row of statusCounts) counts[row.status] = row.count;

    const registered = Object.values(counts).reduce((s, c) => s + c, 0);
    const donated = counts["donated"] ?? 0;
    const conversionPct = registered > 0 ? Math.round((donated / registered) * 100) : 0;

    return NextResponse.json({
      kpis: {
        registered,
        confirmed:  counts["confirmed"]  ?? 0,
        checkedIn:  counts["checked_in"] ?? 0,
        donated,
        deferred:   counts["deferred"]   ?? 0,
        noShow:     counts["no_show"]    ?? 0,
        conversionPct,
      },
      bloodGroupDistribution: bloodGroupCounts
        .filter(r => r.bloodGroup)
        .map(r => ({ name: r.bloodGroup!, value: r.count })),
      registrationsOverTime: regOverTime.map(r => ({ time: r.day, count: r.count })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
