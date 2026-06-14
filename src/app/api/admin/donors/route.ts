import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/server";
import { db } from "@/lib/db/index";
import { donors } from "@/lib/db/schema";
import { desc, isNull, isNotNull, and } from "drizzle-orm";
import {
  softDeleteDonor, hardDeleteDonor, restoreDonor,
  cleanupAllDeletedDonors, updateDonorProfile,
} from "@/lib/db/queries/donors";
import { getAppSettings } from "@/lib/db/queries/events";
import { getAttendeeByDonorAndEvent, createAttendee } from "@/lib/db/queries/attendees";
import { db as rawDb } from "@/lib/db/index";
import { eventAttendees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

async function auth() {
  try { await requireAdmin(); return null; }
  catch (e) { return e instanceof AuthError ? NextResponse.json({ error: e.message }, { status: e.status }) : NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}

export async function GET(req: NextRequest) {
  const err = await auth(); if (err) return err;
  try {
    const showDeleted = req.nextUrl.searchParams.get("deleted") === "1";
    const showUnverified = req.nextUrl.searchParams.get("unverified") === "1";
    const where = showDeleted
      ? isNotNull(donors.deletedAt)
      : showUnverified
        ? and(isNull(donors.deletedAt), isNull(donors.authUserId))
        : isNull(donors.deletedAt);
    const all = await db.query.donors.findMany({
      where,
      orderBy: [desc(donors.createdAt)],
      with: { attendees: { with: { event: true } } },
    });
    return NextResponse.json({ donors: all });
  } catch { return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}

const VALID_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"] as const;

export async function PATCH(req: NextRequest) {
  const err = await auth(); if (err) return err;
  try {
    const body = await req.json();
    const { action, donorId, donorIds, data } = body;

    if (action === "soft_delete") {
      const ids: string[] = donorIds ?? (donorId ? [donorId] : []);
      for (const id of ids) await softDeleteDonor(id);
      return NextResponse.json({ success: true, count: ids.length });
    }

    if (action === "restore") {
      const ids: string[] = donorIds ?? (donorId ? [donorId] : []);
      for (const id of ids) await restoreDonor(id);
      return NextResponse.json({ success: true, count: ids.length });
    }

    if (action === "hard_delete") {
      await hardDeleteDonor(donorId);
      return NextResponse.json({ success: true });
    }

    if (action === "cleanup_all") {
      const count = await cleanupAllDeletedDonors();
      return NextResponse.json({ success: true, count });
    }

    if (action === "update") {
      const schema = z.object({
        fullName: z.string().min(2),
        mobile: z.string().min(6),
        gender: z.enum(["male", "female", "other"]).optional().nullable(),
        company: z.string().optional().nullable(),
        bloodGroup: z.enum(VALID_GROUPS).optional().nullable(),
        dob: z.string().optional().nullable(),
      });
      const parsed = schema.parse(data);
      const updated = await updateDonorProfile(donorId, {
        fullName: parsed.fullName,
        mobile: parsed.mobile,
        gender: (parsed.gender || null) as "male" | "female" | "other" | null,
        company: parsed.company || null,
        bloodGroup: (parsed.bloodGroup as typeof VALID_GROUPS[number] | undefined) || null,
        dob: parsed.dob || null,
      });
      return NextResponse.json({ donor: updated });
    }

    if (action === "assign_event") {
      const settings = await getAppSettings();
      if (!settings?.currentEventId) return NextResponse.json({ error: "No active event" }, { status: 400 });
      const existing = await getAttendeeByDonorAndEvent(donorId, settings.currentEventId);
      if (existing) return NextResponse.json({ error: "Already registered for this event" }, { status: 400 });
      await createAttendee({ eventId: settings.currentEventId, donorId, badgeToken: nanoid(24), status: "registered" });
      return NextResponse.json({ success: true });
    }

    if (action === "remove_event") {
      const settings = await getAppSettings();
      if (!settings?.currentEventId) return NextResponse.json({ error: "No active event" }, { status: 400 });
      await rawDb.delete(eventAttendees).where(
        and(eq(eventAttendees.donorId, donorId), eq(eventAttendees.eventId, settings.currentEventId))
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
