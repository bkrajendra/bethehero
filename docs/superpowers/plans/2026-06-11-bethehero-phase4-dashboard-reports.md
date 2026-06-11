# BeTheHero — Phase 4: Dashboard, Charts & Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phase 3 (admin panel) complete.

**Goal:** Live admin dashboard with animated KPI counters and charts (interval polling via TanStack Query), plus per-event Excel and PDF report exports generated in-memory on demand.

**Architecture:** A single aggregated stats REST endpoint (`/api/admin/stats/[eventId]`) returns all dashboard data. TanStack Query polls it every 12 seconds. Charts use Recharts. Reports use `exceljs` (xlsx) and `@react-pdf/renderer` (pdf), streamed as downloads, never stored.

**Tech Stack:** Recharts, `exceljs`, `@react-pdf/renderer` (already installed in Phase 2), TanStack Query v5 (already installed).

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/app/api/admin/stats/[eventId]/route.ts` | GET — aggregated event stats (KPIs + series) |
| `src/app/admin/page.tsx` | Full dashboard with KPIs + charts (replaces placeholder) |
| `src/components/KPICard.tsx` | Animated counter KPI card |
| `src/components/AdminCharts.tsx` | Recharts wrapper components |
| `src/app/admin/reports/page.tsx` | Report export UI (xlsx + pdf) |
| `src/app/api/admin/reports/[eventId]/xlsx/route.ts` | GET — stream xlsx download |
| `src/app/api/admin/reports/[eventId]/pdf/route.ts` | GET — stream pdf download |
| `src/lib/reports/xlsx.ts` | exceljs report builder |
| `src/lib/reports/pdf.tsx` | @react-pdf/renderer report component |

---

### Task 1: Install Phase 4 dependencies

- [ ] **Step 1: Install Recharts and exceljs**

```bash
pnpm add recharts exceljs
pnpm add -D @types/recharts
```

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install recharts and exceljs for dashboard/reports"
```

---

### Task 2: Stats API endpoint

**Files:**
- Create: `src/app/api/admin/stats/[eventId]/route.ts`

- [ ] **Step 1: Write the aggregated stats endpoint**

```typescript
// src/app/api/admin/stats/[eventId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db/index";
import { eventAttendees } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    await requireAdmin();
    const { eventId } = params;

    // KPI counts per status
    const statusCounts = await db
      .select({
        status: eventAttendees.status,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId))
      .groupBy(eventAttendees.status);

    // Blood group distribution (donors who donated)
    const bloodGroupCounts = await db
      .select({
        bloodGroup: eventAttendees.bloodGroupAtEvent,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(eventAttendees)
      .where(
        and(
          eq(eventAttendees.eventId, eventId),
          eq(eventAttendees.status, "donated"),
        ),
      )
      .groupBy(eventAttendees.bloodGroupAtEvent);

    // Registrations over time (by day)
    const regOverTime = await db
      .select({
        day: sql<string>`date_trunc('hour', ${eventAttendees.createdAt})::text`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(eventAttendees)
      .where(eq(eventAttendees.eventId, eventId))
      .groupBy(sql`date_trunc('hour', ${eventAttendees.createdAt})`)
      .orderBy(sql`date_trunc('hour', ${eventAttendees.createdAt})`);

    const counts: Record<string, number> = {};
    for (const row of statusCounts) counts[row.status] = row.count;

    const registered = Object.values(counts).reduce((s, c) => s + c, 0);
    const donated = counts["donated"] ?? 0;
    const conversionPct = registered > 0 ? Math.round((donated / registered) * 100) : 0;

    return NextResponse.json({
      kpis: {
        registered,
        confirmed:  counts["confirmed"]  ?? 0,
        checkedIn:  counts["checked_in"] ?? 0,
        donated:    counts["donated"]    ?? 0,
        deferred:   counts["deferred"]   ?? 0,
        noShow:     counts["no_show"]    ?? 0,
        conversionPct,
      },
      bloodGroupDistribution: bloodGroupCounts
        .filter(r => r.bloodGroup)
        .map(r => ({ name: r.bloodGroup!, value: r.count })),
      registrationsOverTime: regOverTime.map(r => ({ time: r.day, count: r.count })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/stats/
git commit -m "feat: aggregated stats API endpoint for dashboard polling"
```

---

### Task 3: KPI card component

**Files:**
- Create: `src/components/KPICard.tsx`

- [ ] **Step 1: Write animated KPI card**

```tsx
// src/components/KPICard.tsx
"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  value: number;
  suffix?: string;
  color?: string;
}

function useAnimatedCounter(target: number, duration = 600) {
  const [current, setCurrent] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(step);
      else prev.current = target;
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return current;
}

export function KPICard({ label, value, suffix = "", color = "#fdf0ee" }: Props) {
  const animated = useAnimatedCounter(value);

  return (
    <div className="border border-[rgba(200,16,46,0.2)] rounded-xl p-5 space-y-1 bg-[rgba(200,16,46,0.03)]">
      <p className="text-xs text-[rgba(253,240,238,0.3)] uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-bold tabular-nums" style={{ color }}>
        {animated.toLocaleString()}{suffix}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/KPICard.tsx
git commit -m "feat: animated KPI card with smooth counter transitions"
```

---

### Task 4: Admin dashboard page with polling

**Files:**
- Modify: `src/app/admin/page.tsx` (replace placeholder)

- [ ] **Step 1: Replace the dashboard placeholder with full implementation**

```tsx
// src/app/admin/page.tsx
import { requireAdmin } from "@/lib/auth/server";
import { getAppSettings } from "@/lib/db/queries/events";
import { DashboardClient } from "./DashboardClient";

export default async function AdminDashboard() {
  await requireAdmin();
  const settings = await getAppSettings();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {settings?.currentEventId
        ? <DashboardClient eventId={settings.currentEventId} />
        : <p className="text-[rgba(253,240,238,0.55)]">No active event. Set one in Events.</p>
      }
    </div>
  );
}
```

- [ ] **Step 2: Create DashboardClient component**

```tsx
// src/app/admin/DashboardClient.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const BLOOD_GROUP_COLORS = ["#c8102e","#ff2442","#850020","#e8b84b","#ff6b6b","#ffd700","#ff4444","#cc0000"];

async function fetchStats(eventId: string) {
  const res = await fetch(`/api/admin/stats/${eventId}`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export function DashboardClient({ eventId }: { eventId: string }) {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["adminStats", eventId],
    queryFn: () => fetchStats(eventId),
    refetchInterval: 12_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[rgba(200,16,46,0.05)] animate-pulse" />
        ))}
      </div>
    );
  }

  const { kpis, bloodGroupDistribution, registrationsOverTime } = data;

  const funnelData = [
    { name: "Registered", value: kpis.registered },
    { name: "Checked In", value: kpis.checkedIn },
    { name: "Donated",    value: kpis.donated },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <p className="text-[10px] text-[rgba(253,240,238,0.2)]">
          Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Registered"  value={kpis.registered} />
        <KPICard label="Checked In"  value={kpis.checkedIn}  color="#e8b84b" />
        <KPICard label="Donated"     value={kpis.donated}    color="#22c55e" />
        <KPICard label="Conversion"  value={kpis.conversionPct} suffix="%" color="#ff2442" />
        <KPICard label="Confirmed"   value={kpis.confirmed} />
        <KPICard label="Deferred"    value={kpis.deferred}  color="#f87171" />
        <KPICard label="No-Show"     value={kpis.noShow}    color="#6b7280" />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4 text-[rgba(253,240,238,0.7)]">Donation Funnel</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} barSize={40}>
              <XAxis dataKey="name" tick={{ fill: "rgba(253,240,238,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "#0a0109", border: "1px solid rgba(200,16,46,0.3)", color: "#fdf0ee" }} />
              <Bar dataKey="value" fill="#c8102e" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Blood group distribution */}
        <div className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4 text-[rgba(253,240,238,0.7)]">Blood Group Distribution</h3>
          {bloodGroupDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={bloodGroupDistribution} cx="50%" cy="50%" outerRadius={70}
                  dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  {bloodGroupDistribution.map((_: any, i: number) => (
                    <Cell key={i} fill={BLOOD_GROUP_COLORS[i % BLOOD_GROUP_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a0109", border: "1px solid rgba(200,16,46,0.3)", color: "#fdf0ee" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[rgba(253,240,238,0.3)] text-sm text-center py-8">No donations recorded yet</p>
          )}
        </div>

        {/* Registrations over time */}
        {registrationsOverTime.length > 0 && (
          <div className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 md:col-span-2">
            <h3 className="text-sm font-semibold mb-4 text-[rgba(253,240,238,0.7)]">Registrations Over Time</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={registrationsOverTime}>
                <XAxis dataKey="time" tick={{ fill: "rgba(253,240,238,0.3)", fontSize: 9 }} axisLine={false} tickLine={false}
                  tickFormatter={v => new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#0a0109", border: "1px solid rgba(200,16,46,0.3)", color: "#fdf0ee" }} />
                <Line type="monotone" dataKey="count" stroke="#c8102e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/DashboardClient.tsx
git commit -m "feat: full admin dashboard with KPIs + charts, polling every 12s"
```

---

### Task 5: Excel report builder

**Files:**
- Create: `src/lib/reports/xlsx.ts`
- Create: `src/app/api/admin/reports/[eventId]/xlsx/route.ts`

- [ ] **Step 1: Write xlsx report builder**

```typescript
// src/lib/reports/xlsx.ts
import ExcelJS from "exceljs";
import type { Attendee } from "@/lib/db/queries/attendees";

export async function buildEventXlsx(
  eventName: string,
  attendees: (Attendee & { donor: any; event: any })[],
  kpis: {
    registered: number; checkedIn: number; donated: number;
    deferred: number; noShow: number; conversionPct: number;
  },
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "BeTheHero";

  // ── Attendees sheet ──────────────────────────────────────────
  const ws = wb.addWorksheet("Attendees");
  ws.columns = [
    { header: "Full Name",   key: "fullName",    width: 24 },
    { header: "Company",     key: "company",     width: 22 },
    { header: "Blood Group", key: "bloodGroup",  width: 14 },
    { header: "Status",      key: "status",      width: 14 },
    { header: "Check-In",    key: "checkedInAt", width: 22 },
    { header: "Donated At",  key: "donatedAt",   width: 22 },
    { header: "Certificate", key: "certNumber",  width: 22 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
  headerRow.alignment = { vertical: "middle" };

  for (const a of attendees) {
    ws.addRow({
      fullName:    a.donor.fullName,
      company:     a.donor.company ?? "",
      bloodGroup:  a.bloodGroupAtEvent ?? a.donor.bloodGroup ?? "",
      status:      a.status.replace("_", " "),
      checkedInAt: a.checkedInAt ? new Date(a.checkedInAt).toLocaleString("en-IN") : "",
      donatedAt:   a.donatedAt   ? new Date(a.donatedAt).toLocaleString("en-IN")   : "",
      certNumber:  a.certificateNumber ?? "",
    });
  }

  // ── Summary sheet ────────────────────────────────────────────
  const ws2 = wb.addWorksheet("Summary");
  ws2.getColumn(1).width = 22;
  ws2.getColumn(2).width = 12;

  ws2.addRow(["Event", eventName]);
  ws2.addRow(["Generated", new Date().toLocaleString("en-IN")]);
  ws2.addRow([]);
  ws2.addRow(["KPI", "Count"]);

  const summaryRows = [
    ["Registered",  kpis.registered],
    ["Checked In",  kpis.checkedIn],
    ["Donated",     kpis.donated],
    ["Deferred",    kpis.deferred],
    ["No-Show",     kpis.noShow],
    ["Conversion %", `${kpis.conversionPct}%`],
  ];
  for (const [k, v] of summaryRows) ws2.addRow([k, v]);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
```

- [ ] **Step 2: Write xlsx report route**

```typescript
// src/app/api/admin/reports/[eventId]/xlsx/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { getEventById } from "@/lib/db/queries/events";
import { getAttendeesByEvent } from "@/lib/db/queries/attendees";
import { buildEventXlsx } from "@/lib/reports/xlsx";

export async function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    await requireAdmin();
    const event = await getEventById(params.eventId);
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const attendees = await getAttendeesByEvent(params.eventId);

    // Build KPIs inline for report
    const statusCounts: Record<string, number> = {};
    for (const a of attendees) statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
    const total = attendees.length;
    const donated = statusCounts["donated"] ?? 0;

    const kpis = {
      registered: total,
      checkedIn:  statusCounts["checked_in"] ?? 0,
      donated,
      deferred:   statusCounts["deferred"]   ?? 0,
      noShow:     statusCounts["no_show"]    ?? 0,
      conversionPct: total > 0 ? Math.round((donated / total) * 100) : 0,
    };

    const buffer = await buildEventXlsx(event.name, attendees as any, kpis);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="report-${event.name.replace(/\s+/g,"-")}.xlsx"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/reports/xlsx.ts src/app/api/admin/reports/
git commit -m "feat: per-event Excel report (attendees + summary sheet, in-memory)"
```

---

### Task 6: PDF report

**Files:**
- Create: `src/lib/reports/pdf.tsx`
- Create: `src/app/api/admin/reports/[eventId]/pdf/route.ts`

- [ ] **Step 1: Write PDF report component**

```tsx
// src/lib/reports/pdf.tsx
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page:     { fontFamily: "Helvetica", padding: 40, backgroundColor: "#fff" },
  title:    { fontSize: 20, fontWeight: "bold", color: "#c8102e", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#888", marginBottom: 20 },
  section:  { marginBottom: 16 },
  h2:       { fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#222" },
  row:      { flexDirection: "row", marginBottom: 5 },
  label:    { width: 140, fontSize: 10, color: "#666" },
  value:    { fontSize: 10, color: "#111" },
  divider:  { borderBottom: "1 solid #e0e0e0", marginVertical: 12 },
});

interface Props {
  eventName: string;
  venue: string;
  date: string;
  kpis: {
    registered: number; checkedIn: number; donated: number;
    deferred: number; noShow: number; conversionPct: number;
  };
  bloodGroups: { name: string; value: number }[];
}

export function EventReportPDF({ eventName, venue, date, kpis, bloodGroups }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{eventName}</Text>
        <Text style={styles.subtitle}>{venue} · {date}</Text>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.h2}>Key Performance Indicators</Text>
          {[
            ["Registered",   kpis.registered],
            ["Checked In",   kpis.checkedIn],
            ["Donated",      kpis.donated],
            ["Deferred",     kpis.deferred],
            ["No-Show",      kpis.noShow],
            ["Conversion",   `${kpis.conversionPct}%`],
          ].map(([label, value]) => (
            <View key={String(label)} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {bloodGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h2}>Blood Group Distribution (Donated)</Text>
            {bloodGroups.map(bg => (
              <View key={bg.name} style={styles.row}>
                <Text style={styles.label}>{bg.name}</Text>
                <Text style={styles.value}>{bg.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.divider} />
        <Text style={{ fontSize: 8, color: "#bbb" }}>
          Generated by BeTheHero · {new Date().toLocaleString("en-IN")}
        </Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Write PDF report route**

```typescript
// src/app/api/admin/reports/[eventId]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { getEventById } from "@/lib/db/queries/events";
import { getAttendeesByEvent } from "@/lib/db/queries/attendees";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { EventReportPDF } from "@/lib/reports/pdf";

export async function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    await requireAdmin();
    const event = await getEventById(params.eventId);
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const attendees = await getAttendeesByEvent(params.eventId);
    const statusCounts: Record<string, number> = {};
    for (const a of attendees) statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
    const total = attendees.length;
    const donated = statusCounts["donated"] ?? 0;

    const bloodGroupMap: Record<string, number> = {};
    for (const a of attendees) {
      if (a.status === "donated" && a.bloodGroupAtEvent) {
        bloodGroupMap[a.bloodGroupAtEvent] = (bloodGroupMap[a.bloodGroupAtEvent] ?? 0) + 1;
      }
    }

    const buffer = await renderToBuffer(
      createElement(EventReportPDF, {
        eventName: event.name,
        venue: event.venue,
        date: new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        kpis: {
          registered: total,
          checkedIn:  statusCounts["checked_in"] ?? 0,
          donated,
          deferred:   statusCounts["deferred"]   ?? 0,
          noShow:     statusCounts["no_show"]    ?? 0,
          conversionPct: total > 0 ? Math.round((donated / total) * 100) : 0,
        },
        bloodGroups: Object.entries(bloodGroupMap).map(([name, value]) => ({ name, value })),
      }),
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${event.name.replace(/\s+/g,"-")}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/reports/pdf.tsx src/app/api/admin/reports/
git commit -m "feat: per-event PDF report rendered in-memory with @react-pdf/renderer"
```

---

### Task 7: Reports page UI

**Files:**
- Create: `src/app/admin/reports/page.tsx`

- [ ] **Step 1: Write reports page**

```tsx
// src/app/admin/reports/page.tsx
import { requireAdmin } from "@/lib/auth/server";
import { getAllEvents } from "@/lib/db/queries/events";
import { Button } from "@/components/ui/button";

export default async function ReportsPage() {
  await requireAdmin();
  const events = await getAllEvents();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <p className="text-[rgba(253,240,238,0.55)] text-sm">
        Reports are generated in-memory on demand and streamed as downloads — nothing is stored.
      </p>

      <div className="space-y-3">
        {events.map(event => (
          <div key={event.id} className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">{event.name}</p>
              <p className="text-sm text-[rgba(253,240,238,0.55)]">{event.venue}</p>
              <p className="text-xs text-[rgba(253,240,238,0.3)]">
                {new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild variant="outline" size="sm" className="border-[rgba(200,16,46,0.3)] text-[rgba(253,240,238,0.7)]">
                <a href={`/api/admin/reports/${event.id}/xlsx`} download>Download Excel</a>
              </Button>
              <Button asChild size="sm" className="bg-[#c8102e] hover:bg-[#ff2442]">
                <a href={`/api/admin/reports/${event.id}/pdf`} download>Download PDF</a>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/reports/
git commit -m "feat: reports page with per-event Excel and PDF download buttons"
```

---

### Task 8: Verify Phase 4

- [ ] **Step 1: Run dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test dashboard**

Log in as admin. Go to `/admin`. Confirm KPI cards and charts render. Wait 12s, confirm auto-refresh.

- [ ] **Step 3: Test Excel download**

Go to `/admin/reports`. Click "Download Excel" for an event. Open file and verify attendees + summary sheets.

- [ ] **Step 4: Test PDF download**

Click "Download PDF". Open PDF and verify KPIs and blood group distribution.

- [ ] **Step 5: Commit any fixes**

```bash
git add .
git commit -m "chore: phase 4 dashboard and reports complete"
```
