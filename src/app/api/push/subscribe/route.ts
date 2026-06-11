import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireDonor, AuthError } from "@/lib/auth/server";
import { savePushSubscription } from "@/lib/push/subscriptions";

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh:   z.string(),
  auth:     z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const { donorId } = await requireDonor();
    const body = await req.json();
    const parsed = SubscriptionSchema.parse(body);
    await savePushSubscription({ donorId, ...parsed, userAgent: req.headers.get("user-agent") ?? undefined });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
