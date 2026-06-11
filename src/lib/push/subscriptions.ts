import { eq } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { pushSubscriptions } from "@/lib/db/schema";

export async function savePushSubscription(params: {
  donorId: string; endpoint: string; p256dh: string; auth: string; userAgent?: string;
}) {
  await db.insert(pushSubscriptions).values(params).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: { p256dh: params.p256dh, auth: params.auth, updatedAt: new Date() },
  });
}

export async function deletePushSubscription(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function getPushSubscriptionsByDonor(donorId: string) {
  return db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.donorId, donorId),
  });
}
