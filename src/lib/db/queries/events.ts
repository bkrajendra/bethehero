import { eq } from "drizzle-orm";
import { db } from "../index";
import { events, appSettings } from "../schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;

export async function getActiveEvent() {
  const settings = await db.query.appSettings.findFirst();
  if (!settings?.currentEventId) return null;
  return db.query.events.findFirst({ where: eq(events.id, settings.currentEventId) });
}

export async function getAppSettings() {
  return db.query.appSettings.findFirst();
}

export async function setActiveEvent(eventId: string) {
  const settings = await db.query.appSettings.findFirst();
  if (settings) {
    await db.update(appSettings)
      .set({ currentEventId: eventId, updatedAt: new Date() })
      .where(eq(appSettings.id, settings.id));
  } else {
    await db.insert(appSettings).values({ key: "singleton", currentEventId: eventId });
  }
}

export async function getAllEvents() {
  return db.query.events.findMany({ orderBy: (e, { desc }) => [desc(e.startAt)] });
}

export async function getEventById(id: string) {
  return db.query.events.findFirst({ where: eq(events.id, id) });
}

export async function createEvent(data: NewEvent) {
  const [event] = await db.insert(events).values(data).returning();
  return event;
}

export async function updateEvent(id: string, data: Partial<NewEvent>) {
  const [updated] = await db
    .update(events)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning();
  return updated;
}
