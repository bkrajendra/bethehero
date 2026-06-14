import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/server";
import { db } from "@/lib/db/index";
import { eventAttendees, donors } from "@/lib/db/schema";
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

    // Gender breakdown among donated attendees (join with donors table)
    const genderCounts = await db
      .select({
        gender: donors.gender,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(eventAttendees)
      .innerJoin(donors, eq(eventAttendees.donorId, donors.id))
      .where(and(
        eq(eventAttendees.eventId, eventId),
        eq(eventAttendees.status, "donated"),
      ))
      .groupBy(donors.gender);

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

    // Blood volume: male = 450 mL, female = 350 mL, other/unknown = 400 mL
    const genderMap: Record<string, number> = {};
    for (const row of genderCounts) genderMap[row.gender ?? "unknown"] = row.count;
    const maleCount    = genderMap["male"]    ?? 0;
    const femaleCount  = genderMap["female"]  ?? 0;
    const otherCount   = genderMap["other"]   ?? 0;
    const unknownCount = genderMap["unknown"] ?? 0;
    const totalMl = maleCount * 450 + femaleCount * 350 + (otherCount + unknownCount) * 400;
    const bloodCollectedL = Math.round(totalMl / 100) / 10; // one decimal place

    return NextResponse.json({
      kpis: {
        registered,
        confirmed:      counts["confirmed"]  ?? 0,
        checkedIn:      counts["checked_in"] ?? 0,
        donated,
        deferred:       counts["deferred"]   ?? 0,
        noShow:         counts["no_show"]    ?? 0,
        conversionPct,
        maleCount,
        femaleCount,
        bloodCollectedL,
      },
      genderDistribution: [
        ...(maleCount   > 0 ? [{ name: "Male",   value: maleCount }]   : []),
        ...(femaleCount > 0 ? [{ name: "Female", value: femaleCount }] : []),
        ...(otherCount  > 0 ? [{ name: "Other",  value: otherCount }]  : []),
      ],
      bloodGroupDistribution: bloodGroupCounts
        .filter(r => r.bloodGroup)
        .map(r => ({ name: r.bloodGroup!, value: r.count })),
      registrationsOverTime: regOverTime.map(r => ({ time: r.day, count: r.count })),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api] unexpected error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
