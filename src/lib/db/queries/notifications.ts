import { and, eq, lt } from "drizzle-orm";
import { db } from "../index";
import { notificationJobs } from "../schema";
import type { InferInsertModel } from "drizzle-orm";

export async function enqueueNotification(data: InferInsertModel<typeof notificationJobs>) {
  await db.insert(notificationJobs).values(data).onConflictDoNothing();
}

export async function getPendingNotifications() {
  return db.query.notificationJobs.findMany({
    where: and(
      eq(notificationJobs.status, "pending"),
      lt(notificationJobs.scheduledAt, new Date()),
    ),
    with: {
      attendee: { with: { donor: true, event: true } },
    },
  });
}

export async function markNotificationSent(id: string) {
  await db
    .update(notificationJobs)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(notificationJobs.id, id));
}

export async function markNotificationFailed(id: string, error: string) {
  await db
    .update(notificationJobs)
    .set({ status: "failed", error, updatedAt: new Date() })
    .where(eq(notificationJobs.id, id));
}
