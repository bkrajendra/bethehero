import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/server";
import { db } from "@/lib/db/index";
import { donors } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();
    const all = await db.query.donors.findMany({
      orderBy: [desc(donors.createdAt)],
      with: { attendees: { with: { event: true } } },
    });
    return NextResponse.json({ donors: all });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
