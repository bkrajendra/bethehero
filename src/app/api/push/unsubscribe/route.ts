import { NextRequest, NextResponse } from "next/server";
import { deletePushSubscription } from "@/lib/push/subscriptions";

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    await deletePushSubscription(endpoint);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
