import { NextResponse } from "next/server";
import { requireDonor, AuthError } from "@/lib/auth/server";
import { getAttendeesByDonor } from "@/lib/db/queries/attendees";

export async function GET() {
  try {
    const { donorId } = await requireDonor();
    const attendees = await getAttendeesByDonor(donorId);
    return NextResponse.json({ attendees });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
