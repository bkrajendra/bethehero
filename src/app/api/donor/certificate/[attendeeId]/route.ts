import { NextRequest, NextResponse } from "next/server";
import { requireDonor, AuthError } from "@/lib/auth/server";
import { getAttendeeById } from "@/lib/db/queries/attendees";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ attendeeId: string }> }
) {
  try {
    const { donorId } = await requireDonor();
    const { attendeeId } = await params;
    const attendee = await getAttendeeById(attendeeId);
    if (!attendee) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (attendee.donorId !== donorId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (attendee.status !== "donated") return NextResponse.json({ error: "Certificate not available yet" }, { status: 403 });
    return NextResponse.json({ attendee });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
