# BeTheHero — Phase 3: Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phase 1 (foundation) and Phase 2 (donor flows) complete.

**Goal:** Full admin panel — login, event management (create/edit/set-active), QR scanner with check-in flow, attendees table (status updates, mark donated), global donor directory, and the shared admin layout with event switcher.

**Architecture:** All admin routes live under `/admin`. `requireAdmin()` called at every server entry point. Scanner uses `@zxing/browser` for camera QR decode client-side; badge token resolved server-side via Route Handler. Admin mutations are audited via `writeAuditLog()`. Mark-donated generates a `certificateNumber` and enqueues `thank_you` + `feedback_request` notifications.

**Tech Stack:** Next.js App Router, TypeScript strict, Zod, shadcn/ui (table, dialog, sheet, select), `@zxing/browser`, nanoid, Drizzle.

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/app/admin/layout.tsx` | Admin layout with sidebar + event switcher; enforces requireAdmin |
| `src/app/admin/login/page.tsx` | Admin OTP login |
| `src/app/admin/login/actions.ts` | sendAdminOtp + verifyAdminOtp |
| `src/app/admin/page.tsx` | Dashboard (shell, charts in Phase 4) |
| `src/app/admin/events/page.tsx` | Event list + create |
| `src/app/admin/events/actions.ts` | createEvent, updateEvent, setActiveEvent server actions |
| `src/app/admin/scan/page.tsx` | QR scanner page |
| `src/app/admin/scan/ScannerClient.tsx` | Camera QR scanning (client component) |
| `src/app/admin/attendees/page.tsx` | Attendees table for selected event |
| `src/app/admin/attendees/actions.ts` | checkIn, markDonated, markDeferred, markNoShow |
| `src/app/admin/users/page.tsx` | Global donor directory |
| `src/app/api/admin/resolve-badge/route.ts` | POST — resolve badge token → donor+attendee |
| `src/app/api/admin/stats/[eventId]/route.ts` | GET — aggregated stats for dashboard |
| `src/app/api/admin/attendees/[eventId]/route.ts` | GET — attendees list for event |
| `src/app/api/admin/donors/route.ts` | GET — global donor directory |

---

### Task 1: Install Phase 3 dependencies

- [ ] **Step 1: Install @zxing/browser for QR scanning**

```bash
pnpm add @zxing/browser nanoid
pnpm dlx shadcn@latest add table dialog sheet select textarea tabs
```

Expected: components added to `src/components/ui/`.

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "chore: install phase 3 deps (zxing, shadcn table/dialog/sheet)"
```

---

### Task 2: Admin login

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/actions.ts`

- [ ] **Step 1: Write admin login actions**

```typescript
// src/app/admin/login/actions.ts
"use server";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getAdminByEmail } from "@/lib/db/queries/admins";

export async function sendAdminOtp(email: string): Promise<{ error?: string }> {
  const normalised = email.toLowerCase().trim();
  // Check allowlist before sending OTP
  const admin = await getAdminByEmail(normalised);
  if (!admin || !admin.active) return { error: "Not authorised. Contact your administrator." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalised,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/admin` },
  });
  if (error) return { error: error.message };
  return {};
}

export async function verifyAdminOtp(email: string, token: string): Promise<{ error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !user) return { error: error?.message ?? "Invalid code" };

  // Link auth_user_id to admin record if not yet linked
  const { db } = await import("@/lib/db/index");
  const { admins } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const admin = await getAdminByEmail(email);
  if (admin && admin.authUserId === "00000000-0000-0000-0000-000000000000") {
    await db.update(admins).set({ authUserId: user.id }).where(eq(admins.id, admin.id));
  }
  return {};
}
```

- [ ] **Step 2: Write admin login page**

```tsx
// src/app/admin/login/page.tsx
"use client";
import { useState, useTransition } from "react";
import { sendAdminOtp, verifyAdminOtp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [step, setStep] = useState<"email"|"otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleEmail(e: React.FormEvent) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      const res = await sendAdminOtp(email);
      if (res.error) setError(res.error); else setStep("otp");
    });
  }

  function handleOtp(e: React.FormEvent) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      const res = await verifyAdminOtp(email, otp);
      if (res.error) setError(res.error); else router.push("/admin");
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#fdf0ee]">Admin Login</h1>
          <p className="mt-2 text-[rgba(253,240,238,0.55)]">BeTheHero Admin Panel</p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleEmail} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[#fdf0ee]">Admin Email</Label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
            </div>
            {error && <p className="text-[#ff2442] text-sm">{error}</p>}
            <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#ff2442]">
              {isPending ? "Sending…" : "Send Login Code →"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtp} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[#fdf0ee]">6-Digit Code</Label>
              <Input type="text" inputMode="numeric" pattern="[0-9]{6}" required
                value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456"
                className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] text-center text-2xl tracking-widest" />
            </div>
            {error && <p className="text-[#ff2442] text-sm">{error}</p>}
            <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#ff2442]">
              {isPending ? "Verifying…" : "Verify →"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/login/
git commit -m "feat: admin login with email OTP and allowlist check"
```

---

### Task 3: Admin layout with auth guard and event switcher

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/AdminEventSwitcher.tsx`

- [ ] **Step 1: Write admin layout (server component — guards access)**

```tsx
// src/app/admin/layout.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getAdminByAuthUserId } from "@/lib/db/queries/admins";
import { getAllEvents, getAppSettings } from "@/lib/db/queries/events";
import { AdminSidebar } from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const admin = await getAdminByAuthUserId(user.id);
  if (!admin || !admin.active) redirect("/admin/login");

  const [events, settings] = await Promise.all([getAllEvents(), getAppSettings()]);

  return (
    <div className="flex h-screen bg-[#070108] text-[#fdf0ee]">
      <AdminSidebar admin={admin} events={events} currentEventId={settings?.currentEventId ?? null} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create AdminSidebar component**

```tsx
// src/components/AdminSidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Admin } from "@/lib/db/queries/admins";
import type { Event } from "@/lib/db/queries/events";

interface Props {
  admin: Admin;
  events: Event[];
  currentEventId: string | null;
}

const NAV = [
  { href: "/admin",           label: "Dashboard" },
  { href: "/admin/events",    label: "Events" },
  { href: "/admin/scan",      label: "Scanner" },
  { href: "/admin/attendees", label: "Attendees" },
  { href: "/admin/users",     label: "Donors" },
  { href: "/admin/reports",   label: "Reports" },
];

export function AdminSidebar({ admin, events, currentEventId }: Props) {
  const pathname = usePathname();
  const activeEvent = events.find(e => e.id === currentEventId);

  return (
    <aside className="w-56 flex flex-col border-r border-[rgba(200,16,46,0.15)] bg-[#0a0109]">
      <div className="p-4 border-b border-[rgba(200,16,46,0.15)]">
        <p className="text-xs text-[rgba(253,240,238,0.3)] uppercase tracking-widest">Admin</p>
        <p className="font-semibold text-sm mt-0.5">{admin.name}</p>
        <p className="text-xs text-[rgba(253,240,238,0.3)]">{admin.role}</p>
      </div>

      {activeEvent && (
        <div className="p-3 mx-3 mt-3 rounded-lg bg-[rgba(200,16,46,0.1)] border border-[rgba(200,16,46,0.2)]">
          <p className="text-[10px] text-[rgba(253,240,238,0.3)] uppercase tracking-widest">Active Drive</p>
          <p className="text-xs font-medium mt-0.5 text-[#ff2442]">{activeEvent.name}</p>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 mt-2">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href}
            className={`block px-3 py-2 rounded-lg text-sm transition-colors
              ${pathname === href
                ? "bg-[rgba(200,16,46,0.2)] text-[#ff2442]"
                : "text-[rgba(253,240,238,0.55)] hover:text-[#fdf0ee] hover:bg-[rgba(200,16,46,0.08)]"
              }`}>
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-[rgba(200,16,46,0.15)]">
        <Link href="/" className="text-xs text-[rgba(253,240,238,0.3)] hover:text-[rgba(253,240,238,0.55)]">
          ← Public site
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx src/components/AdminSidebar.tsx
git commit -m "feat: admin layout with server-side auth guard and sidebar navigation"
```

---

### Task 4: Event management

**Files:**
- Create: `src/app/admin/events/page.tsx`
- Create: `src/app/admin/events/actions.ts`

- [ ] **Step 1: Write event server actions**

```typescript
// src/app/admin/events/actions.ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/server";
import { createEvent, updateEvent, setActiveEvent } from "@/lib/db/queries/events";
import { writeAuditLog } from "@/lib/db/queries/audit";

const EventSchema = z.object({
  name:                      z.string().min(3),
  venue:                     z.string().min(3),
  address:                   z.string().min(5),
  startAt:                   z.string().datetime({ offset: true }),
  endAt:                     z.string().datetime({ offset: true }),
  organiserName:             z.string().min(2),
  bloodBankName:             z.string().min(2),
  organiserSignatoryName:    z.string().min(2),
  organiserSignatoryTitle:   z.string().min(2),
  bloodBankSignatoryName:    z.string().min(2),
  bloodBankSignatoryTitle:   z.string().min(2),
});

export async function createEventAction(formData: FormData) {
  const { adminId } = await requireAdmin();
  const parsed = EventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const event = await createEvent({ ...parsed.data, status: "draft" });
  await writeAuditLog({ actorAdminId: adminId, action: "create_event", targetTable: "events", targetId: event.id });
  revalidatePath("/admin/events");
  return { success: true, eventId: event.id };
}

export async function setActiveEventAction(eventId: string) {
  const { adminId } = await requireAdmin();
  await setActiveEvent(eventId);
  await writeAuditLog({ actorAdminId: adminId, action: "set_active_event", targetTable: "events", targetId: eventId });
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  return { success: true };
}

export async function activateEventAction(eventId: string) {
  const { adminId } = await requireAdmin();
  await updateEvent(eventId, { status: "active" });
  await writeAuditLog({ actorAdminId: adminId, action: "activate_event", targetTable: "events", targetId: eventId });
  revalidatePath("/admin/events");
  return { success: true };
}

export async function closeEventAction(eventId: string) {
  const { adminId } = await requireAdmin();
  await updateEvent(eventId, { status: "closed" });
  await writeAuditLog({ actorAdminId: adminId, action: "close_event", targetTable: "events", targetId: eventId });
  revalidatePath("/admin/events");
  return { success: true };
}
```

- [ ] **Step 2: Write events page**

```tsx
// src/app/admin/events/page.tsx
import { getAllEvents, getAppSettings } from "@/lib/db/queries/events";
import { requireAdmin } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";
import { CreateEventDialog } from "./CreateEventDialog";
import { setActiveEventAction, activateEventAction, closeEventAction } from "./actions";

export default async function EventsPage() {
  await requireAdmin();
  const [events, settings] = await Promise.all([getAllEvents(), getAppSettings()]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Events</h1>
        <CreateEventDialog />
      </div>

      <div className="space-y-3">
        {events.map(event => (
          <div key={event.id} className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{event.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize
                  ${event.status === "active" ? "bg-green-500/20 text-green-300" :
                    event.status === "draft" ? "bg-yellow-500/20 text-yellow-300" :
                    "bg-gray-500/20 text-gray-400"}`}>
                  {event.status}
                </span>
                {event.id === settings?.currentEventId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(200,16,46,0.2)] text-[#ff2442]">
                    Public Drive
                  </span>
                )}
              </div>
              <p className="text-sm text-[rgba(253,240,238,0.55)]">{event.venue}</p>
              <p className="text-xs text-[rgba(253,240,238,0.3)]">
                {new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {event.id !== settings?.currentEventId && (
                <form action={setActiveEventAction.bind(null, event.id)}>
                  <Button variant="outline" size="sm" className="border-[rgba(200,16,46,0.3)] text-[rgba(253,240,238,0.7)]">
                    Set as Active Drive
                  </Button>
                </form>
              )}
              {event.status === "draft" && (
                <form action={activateEventAction.bind(null, event.id)}>
                  <Button size="sm" className="bg-[#c8102e] hover:bg-[#ff2442]">Activate</Button>
                </form>
              )}
              {event.status === "active" && (
                <form action={closeEventAction.bind(null, event.id)}>
                  <Button variant="destructive" size="sm">Close</Button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create CreateEventDialog component**

```tsx
// src/app/admin/events/CreateEventDialog.tsx
"use client";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEventAction } from "./actions";

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createEventAction(formData);
      if (res.error) setError(res.error);
      else setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#c8102e] hover:bg-[#ff2442]">+ Create Event</Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0a0109] border-[rgba(200,16,46,0.2)] text-[#fdf0ee] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "name", label: "Event Name", required: true },
            { name: "venue", label: "Venue", required: true },
            { name: "address", label: "Address", required: true },
            { name: "organiserName", label: "Organiser Name", required: true },
            { name: "bloodBankName", label: "Blood Bank Name", required: true },
            { name: "organiserSignatoryName", label: "Organiser Signatory Name", required: true },
            { name: "organiserSignatoryTitle", label: "Organiser Signatory Title", required: true },
            { name: "bloodBankSignatoryName", label: "Blood Bank Signatory Name", required: true },
            { name: "bloodBankSignatoryTitle", label: "Blood Bank Signatory Title", required: true },
          ].map(f => (
            <div key={f.name} className="space-y-1">
              <Label className="text-[#fdf0ee]">{f.label}{f.required && " *"}</Label>
              <Input name={f.name} required={f.required}
                className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee]" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[#fdf0ee]">Start Date/Time *</Label>
              <Input name="startAt" type="datetime-local" required
                className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[#fdf0ee]">End Date/Time *</Label>
              <Input name="endAt" type="datetime-local" required
                className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee]" />
            </div>
          </div>
          {error && <p className="text-[#ff2442] text-sm">{error}</p>}
          <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#ff2442]">
            {isPending ? "Creating…" : "Create Event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/events/
git commit -m "feat: admin event management (create, activate, close, set-active)"
```

---

### Task 5: Badge resolve API + QR scanner

**Files:**
- Create: `src/app/api/admin/resolve-badge/route.ts`
- Create: `src/app/admin/scan/page.tsx`
- Create: `src/app/admin/scan/ScannerClient.tsx`

- [ ] **Step 1: Write badge resolve API**

```typescript
// src/app/api/admin/resolve-badge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/server";
import { getAttendeeByBadgeToken } from "@/lib/db/queries/attendees";
import { getAppSettings } from "@/lib/db/queries/events";

export async function POST(req: NextRequest) {
  try {
    const { admin } = await requireAdmin();
    const body = await req.json();
    const { badgeToken } = z.object({ badgeToken: z.string() }).parse(body);

    const attendee = await getAttendeeByBadgeToken(badgeToken);
    if (!attendee) return NextResponse.json({ error: "Badge not found" }, { status: 404 });

    const settings = await getAppSettings();
    if (!settings?.currentEventId) return NextResponse.json({ error: "No active event" }, { status: 400 });

    // Reject if token belongs to a different event than the working context
    if (attendee.eventId !== settings.currentEventId) {
      return NextResponse.json({ error: "Badge is for a different event" }, { status: 400 });
    }

    // Return minimum PII needed for check-in — no DoB, masked mobile
    return NextResponse.json({
      attendeeId:   attendee.id,
      donorId:      attendee.donorId,
      status:       attendee.status,
      fullName:     attendee.donor.fullName,
      company:      attendee.donor.company,
      mobile:       attendee.donor.mobile.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2"),
      bloodGroup:   attendee.bloodGroupAtEvent ?? attendee.donor.bloodGroup,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

- [ ] **Step 2: Write ScannerClient (camera QR)**

```tsx
// src/app/admin/scan/ScannerClient.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkInAction, markDonatedAction } from "../attendees/actions";

interface DonorInfo {
  attendeeId: string;
  donorId: string;
  status: string;
  fullName: string;
  company: string | null;
  mobile: string;
  bloodGroup: string | null;
}

export function ScannerClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const [scanning, setScanning] = useState(false);
  const [donor, setDonor] = useState<DonorInfo | null>(null);
  const [error, setError] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  async function startScanner() {
    setScanning(true);
    setDonor(null);
    setError("");
    setSuccessMsg("");

    const reader = new BrowserQRCodeReader();
    readerRef.current = reader;

    try {
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      const deviceId = devices[devices.length - 1]?.deviceId; // prefer back camera

      await reader.decodeFromVideoDevice(deviceId, videoRef.current!, async (result, err) => {
        if (result) {
          setScanning(false);
          reader.reset();

          // Extract badge token from URL
          const url = result.getText();
          const token = url.split("/badge/")[1]?.split("?")[0];
          if (!token) { setError("Invalid QR code format"); return; }

          const res = await fetch("/api/admin/resolve-badge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ badgeToken: token }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.error); return; }
          setDonor(data);
          setBloodGroup(data.bloodGroup ?? "");
        }
      });
    } catch (e: any) {
      setError(e.message ?? "Camera error");
      setScanning(false);
    }
  }

  function stopScanner() {
    readerRef.current?.reset();
    setScanning(false);
  }

  async function handleCheckIn() {
    if (!donor) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.set("attendeeId", donor.attendeeId);
    formData.set("bloodGroup", bloodGroup);
    const res = await checkInAction(formData);
    setIsProcessing(false);
    if (res.error) setError(res.error);
    else { setSuccessMsg("Checked in!"); setDonor(prev => prev ? { ...prev, status: "checked_in" } : prev); }
  }

  async function handleMarkDonated() {
    if (!donor) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.set("attendeeId", donor.attendeeId);
    const res = await markDonatedAction(formData);
    setIsProcessing(false);
    if (res.error) setError(res.error);
    else { setSuccessMsg("Marked as donated!"); setDonor(prev => prev ? { ...prev, status: "donated" } : prev); }
  }

  const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="relative aspect-square rounded-xl overflow-hidden border border-[rgba(200,16,46,0.3)] bg-black">
        <video ref={videoRef} className={`w-full h-full object-cover ${scanning ? "block" : "hidden"}`} />
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[rgba(253,240,238,0.3)]">Camera inactive</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {!scanning ? (
          <Button onClick={startScanner} className="flex-1 bg-[#c8102e] hover:bg-[#ff2442]">
            Start Scanner
          </Button>
        ) : (
          <Button onClick={stopScanner} variant="outline" className="flex-1 border-[rgba(200,16,46,0.3)]">
            Stop Scanner
          </Button>
        )}
      </div>

      {error && <p className="text-[#ff2442] text-sm">{error}</p>}
      {successMsg && <p className="text-green-400 text-sm font-semibold">{successMsg}</p>}

      {donor && (
        <div className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 space-y-4">
          <div>
            <p className="font-bold text-lg">{donor.fullName}</p>
            <p className="text-sm text-[rgba(253,240,238,0.55)]">{donor.company ?? "—"}</p>
            <p className="text-sm text-[rgba(253,240,238,0.3)]">{donor.mobile}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(200,16,46,0.15)] text-[#ff2442] capitalize">
              {donor.status.replace("_", " ")}
            </span>
          </div>

          <div className="space-y-2">
            <Label className="text-[#fdf0ee]">Blood Group</Label>
            <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}
              className="w-full rounded-md border border-[rgba(200,16,46,0.3)] bg-transparent text-[#fdf0ee] px-3 py-2 text-sm">
              <option value="">Select blood group</option>
              {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            {donor.status === "registered" || donor.status === "confirmed" ? (
              <Button onClick={handleCheckIn} disabled={isProcessing || !bloodGroup}
                className="flex-1 bg-[#c8102e] hover:bg-[#ff2442]">
                {isProcessing ? "Processing…" : "Check In"}
              </Button>
            ) : donor.status === "checked_in" ? (
              <Button onClick={handleMarkDonated} disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-500">
                {isProcessing ? "Processing…" : "Mark Donated"}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write scan page**

```tsx
// src/app/admin/scan/page.tsx
import { requireAdmin } from "@/lib/auth/server";
import { ScannerClient } from "./ScannerClient";

export default async function ScanPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Badge Scanner</h1>
      <p className="text-[rgba(253,240,238,0.55)] text-sm">Point the camera at a donor's badge QR to check them in.</p>
      <ScannerClient />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/resolve-badge/ src/app/admin/scan/
git commit -m "feat: admin QR scanner with badge resolve, check-in, and mark donated"
```

---

### Task 6: Attendees table with admin actions

**Files:**
- Create: `src/app/admin/attendees/page.tsx`
- Create: `src/app/admin/attendees/actions.ts`
- Create: `src/app/api/admin/attendees/[eventId]/route.ts`

- [ ] **Step 1: Write attendee mutation actions**

```typescript
// src/app/admin/attendees/actions.ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/server";
import { getAttendeeById, updateAttendee } from "@/lib/db/queries/attendees";
import { enqueueNotification } from "@/lib/db/queries/notifications";
import { writeAuditLog } from "@/lib/db/queries/audit";
import { nanoid } from "nanoid";

export async function checkInAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const { adminId } = await requireAdmin();
    const attendeeId = z.string().uuid().parse(formData.get("attendeeId"));
    const bloodGroup = formData.get("bloodGroup") as string | null;

    const attendee = await getAttendeeById(attendeeId);
    if (!attendee) return { error: "Attendee not found" };

    await updateAttendee(attendeeId, {
      status: "checked_in",
      checkedInAt: new Date(),
      checkedInBy: adminId,
      ...(bloodGroup ? { bloodGroupAtEvent: bloodGroup as any } : {}),
    });
    await writeAuditLog({ actorAdminId: adminId, action: "check_in", targetTable: "event_attendees", targetId: attendeeId });
    revalidatePath("/admin/attendees");
    return { success: true };
  } catch (e: any) {
    return { error: e.message ?? "Failed" };
  }
}

export async function markDonatedAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const { adminId } = await requireAdmin();
    const attendeeId = z.string().uuid().parse(formData.get("attendeeId"));

    const attendee = await getAttendeeById(attendeeId);
    if (!attendee) return { error: "Attendee not found" };
    if (!attendee.bloodGroupAtEvent) return { error: "Blood group must be captured before marking donated" };

    const certificateNumber = `BTH-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;

    await updateAttendee(attendeeId, {
      status: "donated",
      donatedAt: new Date(),
      markedBy: adminId,
      certificateNumber,
      certificateIssuedAt: new Date(),
    });

    // Enqueue thank-you and feedback notifications
    await enqueueNotification({
      attendeeId, type: "thank_you", channel: "email",
      scheduledAt: new Date(),
      dedupeKey: `thank-you-email-${attendeeId}`,
    });
    await enqueueNotification({
      attendeeId, type: "feedback_request", channel: "email",
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2h later
      dedupeKey: `feedback-email-${attendeeId}`,
    });

    await writeAuditLog({ actorAdminId: adminId, action: "mark_donated", targetTable: "event_attendees", targetId: attendeeId, metadata: { certificateNumber } });
    revalidatePath("/admin/attendees");
    return { success: true };
  } catch (e: any) {
    return { error: e.message ?? "Failed" };
  }
}

export async function markDeferredAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const { adminId } = await requireAdmin();
    const attendeeId = z.string().uuid().parse(formData.get("attendeeId"));
    const reason = (formData.get("reason") as string) || null;
    await updateAttendee(attendeeId, { status: "deferred", deferralReason: reason });
    await writeAuditLog({ actorAdminId: adminId, action: "mark_deferred", targetTable: "event_attendees", targetId: attendeeId });
    revalidatePath("/admin/attendees");
    return { success: true };
  } catch (e: any) {
    return { error: e.message ?? "Failed" };
  }
}

export async function markNoShowAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    const { adminId } = await requireAdmin();
    const attendeeId = z.string().uuid().parse(formData.get("attendeeId"));
    await updateAttendee(attendeeId, { status: "no_show" });
    await writeAuditLog({ actorAdminId: adminId, action: "mark_no_show", targetTable: "event_attendees", targetId: attendeeId });
    revalidatePath("/admin/attendees");
    return { success: true };
  } catch (e: any) {
    return { error: e.message ?? "Failed" };
  }
}
```

- [ ] **Step 2: Write attendees list API**

```typescript
// src/app/api/admin/attendees/[eventId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
import { getAttendeesByEvent } from "@/lib/db/queries/attendees";

export async function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    await requireAdmin();
    const attendees = await getAttendeesByEvent(params.eventId);
    return NextResponse.json({ attendees });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

- [ ] **Step 3: Write attendees page (server component with data)**

```tsx
// src/app/admin/attendees/page.tsx
import { requireAdmin } from "@/lib/auth/server";
import { getAppSettings } from "@/lib/db/queries/events";
import { getAttendeesByEvent } from "@/lib/db/queries/attendees";
import { checkInAction, markDonatedAction, markDeferredAction, markNoShowAction } from "./actions";
import { Button } from "@/components/ui/button";

const STATUS_COLORS: Record<string, string> = {
  registered: "bg-blue-500/20 text-blue-300",
  confirmed:  "bg-yellow-500/20 text-yellow-300",
  checked_in: "bg-orange-500/20 text-orange-300",
  donated:    "bg-green-500/20 text-green-300",
  deferred:   "bg-red-500/20 text-red-300",
  no_show:    "bg-gray-500/20 text-gray-400",
};

export default async function AttendeesPage() {
  await requireAdmin();
  const settings = await getAppSettings();
  if (!settings?.currentEventId) {
    return <div className="text-[rgba(253,240,238,0.55)]">No active event. Set one in the Events tab.</div>;
  }

  const attendees = await getAttendeesByEvent(settings.currentEventId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Attendees</h1>
        <span className="text-sm text-[rgba(253,240,238,0.3)]">{attendees.length} total</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[rgba(200,16,46,0.2)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[rgba(200,16,46,0.2)]">
            <tr>
              {["Name", "Company", "Blood Group", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[rgba(253,240,238,0.3)] font-medium text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attendees.map(a => (
              <tr key={a.id} className="border-b border-[rgba(200,16,46,0.08)] hover:bg-[rgba(200,16,46,0.04)]">
                <td className="px-4 py-3 font-medium">{a.donor.fullName}</td>
                <td className="px-4 py-3 text-[rgba(253,240,238,0.55)]">{a.donor.company ?? "—"}</td>
                <td className="px-4 py-3 text-[rgba(253,240,238,0.55)]">{a.bloodGroupAtEvent ?? a.donor.bloodGroup ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[a.status]}`}>
                    {a.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {(a.status === "registered" || a.status === "confirmed") && (
                      <form action={checkInAction}>
                        <input type="hidden" name="attendeeId" value={a.id} />
                        <Button size="sm" type="submit" className="bg-[#c8102e] hover:bg-[#ff2442] h-7 text-xs">Check In</Button>
                      </form>
                    )}
                    {a.status === "checked_in" && (
                      <form action={markDonatedAction}>
                        <input type="hidden" name="attendeeId" value={a.id} />
                        <Button size="sm" type="submit" className="bg-green-600 hover:bg-green-500 h-7 text-xs">Mark Donated</Button>
                      </form>
                    )}
                    {!["donated", "deferred", "no_show"].includes(a.status) && (
                      <>
                        <form action={markDeferredAction}>
                          <input type="hidden" name="attendeeId" value={a.id} />
                          <Button size="sm" variant="outline" type="submit" className="border-yellow-500/30 text-yellow-300 h-7 text-xs">Defer</Button>
                        </form>
                        <form action={markNoShowAction}>
                          <input type="hidden" name="attendeeId" value={a.id} />
                          <Button size="sm" variant="outline" type="submit" className="border-gray-500/30 text-gray-400 h-7 text-xs">No-Show</Button>
                        </form>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/attendees/ src/app/api/admin/attendees/
git commit -m "feat: admin attendees table with check-in, mark donated, defer, no-show"
```

---

### Task 7: Admin donor directory

**Files:**
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/api/admin/donors/route.ts`

- [ ] **Step 1: Write donors API**

```typescript
// src/app/api/admin/donors/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server";
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
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

- [ ] **Step 2: Write users page (client-side for search)**

```tsx
// src/app/admin/users/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["adminDonors"],
    queryFn: async () => {
      const res = await fetch("/api/admin/donors");
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
  });

  const donors: any[] = (data?.donors ?? []).filter((d: any) =>
    d.fullName.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="animate-pulse text-[rgba(253,240,238,0.3)]">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Donor Directory</h1>
        <span className="text-sm text-[rgba(253,240,238,0.3)]">{data?.donors?.length ?? 0} total</span>
      </div>

      <Input
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]"
      />

      <div className="space-y-3">
        {donors.map((d: any) => (
          <div key={d.id} className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{d.fullName}</p>
                <p className="text-sm text-[rgba(253,240,238,0.55)]">{d.email}</p>
                <p className="text-xs text-[rgba(253,240,238,0.3)]">{d.mobile} · {d.company ?? "No company"} · {d.bloodGroup ?? "Blood group unknown"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[rgba(253,240,238,0.3)]">{d.attendees?.length ?? 0} events</p>
              </div>
            </div>
            {d.attendees?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {d.attendees.map((a: any) => (
                  <span key={a.id} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(200,16,46,0.1)] text-[rgba(253,240,238,0.5)]">
                    {a.event?.name?.slice(0, 20)} — {a.status.replace("_"," ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create admin dashboard placeholder**

```tsx
// src/app/admin/page.tsx
import { requireAdmin } from "@/lib/auth/server";

export default async function AdminDashboard() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-[rgba(253,240,238,0.55)]">Charts and live stats coming in Phase 4.</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/users/ src/app/admin/page.tsx src/app/api/admin/donors/
git commit -m "feat: admin donor directory and dashboard placeholder"
```

---

### Task 8: Verify Phase 3

- [ ] **Step 1: Run dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test admin login**

Go to http://localhost:3000/admin/login. Enter seeded admin email. Verify OTP and confirm redirect to `/admin`.

- [ ] **Step 3: Test event creation**

Go to `/admin/events`. Create a new event. Confirm it appears in the list. Set it as active.

- [ ] **Step 4: Test attendees table**

Go to `/admin/attendees`. Confirm seeded donors appear. Click Check In on one. Confirm status updates.

- [ ] **Step 5: Test scanner (needs HTTPS or localhost with camera permission)**

Go to `/admin/scan`. Start scanner. Confirm camera opens.

- [ ] **Step 6: Commit any fixes**

```bash
git add .
git commit -m "chore: phase 3 admin panel complete"
```
