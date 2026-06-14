import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, AuthError } from "@/lib/auth/server";
import { getAttendeeByBadgeToken } from "@/lib/db/queries/attendees";
import { getAppSettings } from "@/lib/db/queries/events";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { badgeToken } = z.object({ badgeToken: z.string() }).parse(body);

    const attendee = await getAttendeeByBadgeToken(badgeToken);
    if (!attendee) return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    if (!attendee.donor) return NextResponse.json({ error: "Donor data missing" }, { status: 500 });

    const settings = await getAppSettings();
    if (!settings?.currentEventId) return NextResponse.json({ error: "No active event" }, { status: 400 });
    if (attendee.eventId !== settings.currentEventId) {
      return NextResponse.json({ error: "Badge is for a different event" }, { status: 400 });
    }

    return NextResponse.json({
      attendeeId:  attendee.id,
      donorId:     attendee.donorId,
      status:      attendee.status,
      fullName:    attendee.donor.fullName,
      company:     attendee.donor.company,
      mobile:      attendee.donor.mobile,
      bloodGroup:  attendee.bloodGroupAtEvent ?? attendee.donor.bloodGroup,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
