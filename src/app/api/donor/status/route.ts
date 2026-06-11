import { NextResponse } from "next/server";
import { requireDonor, AuthError } from "@/lib/auth/server";
import { getActiveEvent } from "@/lib/db/queries/events";
import { getAttendeeByDonorAndEvent } from "@/lib/db/queries/attendees";

export async function GET() {
  try {
    const { donorId } = await requireDonor();
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ attendee: null, event: null });
    const attendee = await getAttendeeByDonorAndEvent(donorId, event.id);
    return NextResponse.json({ attendee, event });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
