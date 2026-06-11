import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireDonor, AuthError } from "@/lib/auth/server";
import { db } from "@/lib/db/index";
import { pushSubscriptions } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { donorId } = await requireDonor();
    const { endpoint } = await req.json();
    await db.delete(pushSubscriptions).where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.donorId, donorId),
      )
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
