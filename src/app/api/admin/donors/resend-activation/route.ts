import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db/index";
import { donors } from "@/lib/db/schema";
import { eq, isNull, inArray } from "drizzle-orm";
import { getAppSettings } from "@/lib/db/queries/events";
import { sendEmail } from "@/lib/onesignal/client";
import { activationEmailHtml } from "@/lib/email/templates/activation";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const { donorIds }: { donorIds: string[] } = await req.json();
    if (!Array.isArray(donorIds) || donorIds.length === 0) {
      return NextResponse.json({ error: "donorIds required" }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    // Fetch event details for the dos/don'ts
    const settings = await getAppSettings();
    let eventData: { name: string; venue: string; address: string; startAt: Date; instructionsDos: string[]; instructionsDonts: string[] } | null = null;
    if (settings?.currentEventId) {
      const { db: rawDb } = await import("@/lib/db/index");
      const { events } = await import("@/lib/db/schema");
      const [ev] = await rawDb.select().from(events).where(eq(events.id, settings.currentEventId)).limit(1);
      if (ev) {
        eventData = {
          name: ev.name,
          venue: ev.venue,
          address: ev.address,
          startAt: new Date(ev.startAt),
          instructionsDos: (ev.instructionsDos as string[]) ?? [],
          instructionsDonts: (ev.instructionsDonts as string[]) ?? [],
        };
      }
    }

    // Fetch the requested donors (unverified only for safety)
    const rows = await db.select().from(donors).where(
      inArray(donors.id, donorIds)
    );

    const results: { email: string; status: "sent" | "failed"; error?: string }[] = [];

    for (const donor of rows) {
      try {
        const redirectTo = `${appUrl}/auth/callback?next=/status`;
        const { data, error } = await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: donor.email,
          options: { redirectTo },
        });

        if (error || !data?.properties?.action_link) {
          results.push({ email: donor.email, status: "failed", error: error?.message ?? "No link generated" });
          continue;
        }

        const activationUrl = data.properties.action_link;

        await sendEmail({
          to: donor.email,
          subject: "Activate your BeTheHero account — one click away",
          html: activationEmailHtml({
            fullName: donor.fullName,
            activationUrl,
            ...(eventData ?? {}),
          }),
        });

        results.push({ email: donor.email, status: "sent" });
      } catch (e) {
        results.push({ email: donor.email, status: "failed", error: e instanceof Error ? e.message : "Unknown error" });
      }
    }

    const sent = results.filter(r => r.status === "sent").length;
    const failed = results.filter(r => r.status === "failed").length;
    return NextResponse.json({ results, sent, failed });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 });
  }
}
