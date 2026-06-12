import { NextResponse } from "next/server";
import { requireDonor, AuthError } from "@/lib/auth/server";
import { getActiveEvent } from "@/lib/db/queries/events";
import { getAttendeeByDonorAndEvent, getAttendeeById } from "@/lib/db/queries/attendees";
import { generateQRDataURL } from "@/lib/qr/generate";

export async function GET() {
  try {
    const { donorId } = await requireDonor();
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ attendee: null, event: null });

    const slim = await getAttendeeByDonorAndEvent(donorId, event.id);
    if (!slim) return NextResponse.json({ attendee: null, event });

    const attendee = await getAttendeeById(slim.id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const qrDataUrl = await generateQRDataURL(slim.badgeToken, appUrl);

    return NextResponse.json({ attendee, event, qrDataUrl });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
