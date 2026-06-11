# BeTheHero — Phase 2: Donor Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phase 1 complete (DB, auth guards, seed data in place).

**Goal:** All donor-facing pages — registration form (new/already-exists/no-active-event states), confirmation screen with badge QR, auth login/callback, donation status with interval polling, donation history, certificate download (on-the-fly PDF), and feedback form.

**Architecture:** Server Actions for mutations (registration, feedback submit). Route Handlers for polling endpoints (`/api/donor/status`, `/api/donor/history`). Supabase `@supabase/ssr` for session management. `@react-pdf/renderer` for on-the-fly certificate (client-side render + download, server-side in-memory for email). All donor queries scoped by `requireDonor()`. TanStack Query v5 for polling.

**Tech Stack:** Next.js App Router, TypeScript strict, Zod, nanoid, `qrcode`, `@react-pdf/renderer`, TanStack Query v5, Framer Motion, shadcn/ui, Tailwind v4.

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/app/(public)/register/page.tsx` | Registration form (client component) |
| `src/app/(public)/register/actions.ts` | `registerDonor` server action |
| `src/app/(public)/register/ConfirmationScreen.tsx` | Post-register success screen + badge QR |
| `src/app/(public)/login/page.tsx` | Donor login (email → OTP) |
| `src/app/(public)/login/actions.ts` | `sendOtp` server action |
| `src/app/(public)/status/page.tsx` | Donor status page (polling) |
| `src/app/(public)/history/page.tsx` | Donation history list |
| `src/app/(public)/certificate/[attendeeId]/page.tsx` | Certificate download page |
| `src/app/(public)/certificate/[attendeeId]/CertificatePDF.tsx` | `@react-pdf/renderer` PDF component |
| `src/app/(public)/feedback/[attendeeId]/page.tsx` | Feedback form |
| `src/app/(public)/feedback/[attendeeId]/actions.ts` | `submitFeedback` server action |
| `src/app/(public)/layout.tsx` | Minimal public layout (logo, nav) |
| `src/app/api/donor/status/route.ts` | GET — polling: current event attendee status |
| `src/app/api/donor/history/route.ts` | GET — all attendees for donor |
| `src/lib/qr/generate.ts` | `generateBadgeToken()` + `generateQRDataURL()` |
| `src/components/DonationCelebration.tsx` | Animated crown/confetti on `donated` status |
| `src/components/StatusTimeline.tsx` | Registered → confirmed → checked_in → donated visual |

---

### Task 1: Install Phase 2 dependencies

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add @tanstack/react-query qrcode @react-pdf/renderer framer-motion
pnpm add -D @types/qrcode
```

- [ ] **Step 2: Add TanStack Query provider to root layout**

Open `src/app/layout.tsx` and wrap children in a `QueryClientProvider`:

```tsx
// src/app/layout.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// NOTE: only the provider wrapper is client; the outer layout stays as Server Component
// Pattern: create a separate Providers component

// Create src/components/Providers.tsx:
```

Create `src/components/Providers.tsx`:

```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

Then in `src/app/layout.tsx` import and wrap:

```tsx
import { Providers } from "@/components/Providers";
// ... existing layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: install phase 2 deps, add TanStack Query provider"
```

---

### Task 2: QR generation utility

**Files:**
- Create: `src/lib/qr/generate.ts`

- [ ] **Step 1: Write QR helpers**

```typescript
// src/lib/qr/generate.ts
import { nanoid } from "nanoid";
import QRCode from "qrcode";

export function generateBadgeToken(): string {
  return nanoid(24);
}

/** Generates a data-URL PNG for the badge QR. URL points to the attendee badge page. */
export async function generateQRDataURL(badgeToken: string, appUrl: string): Promise<string> {
  const url = `${appUrl}/badge/${badgeToken}`;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    color: { dark: "#070108", light: "#fdf0ee" },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/qr/
git commit -m "feat: add QR generation utility (badge token + data URL)"
```

---

### Task 3: Registration server action

**Files:**
- Create: `src/app/(public)/register/actions.ts`

- [ ] **Step 1: Write `registerDonor` server action with full validation**

```typescript
// src/app/(public)/register/actions.ts
"use server";
import { z } from "zod";
import { getDonorByEmail, createDonor } from "@/lib/db/queries/donors";
import { getActiveEvent } from "@/lib/db/queries/events";
import { createAttendee } from "@/lib/db/queries/attendees";
import { enqueueNotification } from "@/lib/db/queries/notifications";
import { generateBadgeToken } from "@/lib/qr/generate";

const RegisterSchema = z.object({
  email:        z.string().email().toLowerCase(),
  mobile:       z.string().min(10).max(15),
  fullName:     z.string().min(2).max(100),
  company:      z.string().max(100).optional(),
  bloodGroup:   z.enum(["A+","A-","B+","B-","AB+","AB-","O+","O-"]).optional(),
  dob:          z.string().optional(),
  consentGiven: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
});

export type RegisterResult =
  | { type: "success"; attendeeId: string; badgeToken: string; eventId: string }
  | { type: "no_event"; donorId: string }
  | { type: "already_exists" }
  | { type: "error"; message: string };

export async function registerDonor(formData: FormData): Promise<RegisterResult> {
  const raw = {
    email:        formData.get("email"),
    mobile:       formData.get("mobile"),
    fullName:     formData.get("fullName"),
    company:      formData.get("company") || undefined,
    bloodGroup:   formData.get("bloodGroup") || undefined,
    dob:          formData.get("dob") || undefined,
    consentGiven: formData.get("consentGiven") === "on" ? true : undefined,
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { type: "error", message: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  // Check existing donor
  const existing = await getDonorByEmail(data.email);
  if (existing) return { type: "already_exists" };

  // Create donor
  const donor = await createDonor({
    email:          data.email,
    mobile:         data.mobile,
    fullName:       data.fullName,
    company:        data.company ?? null,
    bloodGroup:     (data.bloodGroup as any) ?? null,
    dob:            data.dob ?? null,
    consentGiven:   true,
    consentAt:      new Date(),
    consentVersion: "v1.0",
  });

  // Check for active event
  const event = await getActiveEvent();
  const now = new Date();
  if (!event || event.status !== "active" || now > new Date(event.endAt)) {
    return { type: "no_event", donorId: donor.id };
  }

  // Create attendee
  const badgeToken = generateBadgeToken();
  const attendee = await createAttendee({
    eventId:    event.id,
    donorId:    donor.id,
    badgeToken,
    status:     "registered",
  });

  // Enqueue confirmation notification
  await enqueueNotification({
    attendeeId:  attendee.id,
    type:        "confirmation",
    channel:     "email",
    scheduledAt: new Date(),
    dedupeKey:   `confirmation-email-${attendee.id}`,
  });

  return { type: "success", attendeeId: attendee.id, badgeToken, eventId: event.id };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(public\)/register/actions.ts
git commit -m "feat: add registerDonor server action with full validation"
```

---

### Task 4: Registration form page

**Files:**
- Create: `src/app/(public)/register/page.tsx`
- Create: `src/app/(public)/register/ConfirmationScreen.tsx`

- [ ] **Step 1: Write registration form**

```tsx
// src/app/(public)/register/page.tsx
"use client";
import { useState, useTransition } from "react";
import { registerDonor, type RegisterResult } from "./actions";
import { ConfirmationScreen } from "./ConfirmationScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"] as const;

export default function RegisterPage() {
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await registerDonor(formData);
      if (res.type === "error") setError(res.message);
      else setResult(res);
    });
  }

  if (result?.type === "success") {
    return <ConfirmationScreen attendeeId={result.attendeeId} badgeToken={result.badgeToken} eventId={result.eventId} />;
  }

  if (result?.type === "no_event") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl animate-pulse">🩸</div>
          <h2 className="text-2xl font-bold text-[#fdf0ee]">Thank you for your interest!</h2>
          <p className="text-[rgba(253,240,238,0.55)]">
            There's no active blood donation drive right now. We've saved your details and will reach out when the next drive is scheduled.
          </p>
          <Button variant="outline" asChild className="border-[#c8102e] text-[#fdf0ee]">
            <Link href="/">Close</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (result?.type === "already_exists") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
        <div className="max-w-md w-full text-center space-y-6">
          <h2 className="text-2xl font-bold text-[#fdf0ee]">You're already registered!</h2>
          <p className="text-[rgba(253,240,238,0.55)]">Log in to view your badge and donation status.</p>
          <Button asChild className="bg-[#c8102e] hover:bg-[#ff2442]">
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#fdf0ee]">Register to Donate</h1>
          <p className="mt-2 text-[rgba(253,240,238,0.55)]">Blood Donation Drive 2026</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#fdf0ee]">Email *</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com"
              className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-[#fdf0ee]">Mobile *</Label>
            <Input id="mobile" name="mobile" type="tel" required placeholder="+91 98765 43210"
              className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-[#fdf0ee]">Full Name *</Label>
            <Input id="fullName" name="fullName" required placeholder="Your full name"
              className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="text-[#fdf0ee]">Company</Label>
            <Input id="company" name="company" placeholder="Your company (optional)"
              className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#fdf0ee]">Blood Group</Label>
              <select name="bloodGroup" className="w-full rounded-md border border-[rgba(200,16,46,0.3)] bg-transparent text-[#fdf0ee] px-3 py-2 text-sm">
                <option value="">Select (optional)</option>
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob" className="text-[#fdf0ee]">Date of Birth</Label>
              <Input id="dob" name="dob" type="date"
                className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee]" />
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <input type="checkbox" id="consentGiven" name="consentGiven" required
              className="mt-0.5 h-4 w-4 accent-[#c8102e]" />
            <Label htmlFor="consentGiven" className="text-sm text-[rgba(253,240,238,0.55)] leading-relaxed">
              I consent to the collection and use of my personal data for this blood donation drive in accordance with the DPDP Act.
            </Label>
          </div>

          {error && <p className="text-[#ff2442] text-sm">{error}</p>}

          <Button type="submit" disabled={isPending}
            className="w-full bg-[#c8102e] hover:bg-[#ff2442] text-white font-semibold py-3">
            {isPending ? "Registering…" : "Register to Donate →"}
          </Button>
        </form>

        <p className="text-center text-sm text-[rgba(253,240,238,0.28)]">
          Already registered?{" "}
          <Link href="/login" className="text-[#c8102e] hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Write ConfirmationScreen component**

```tsx
// src/app/(public)/register/ConfirmationScreen.tsx
"use client";
import { useEffect, useState } from "react";
import { generateQRDataURL } from "@/lib/qr/generate";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Props {
  attendeeId: string;
  badgeToken: string;
  eventId: string;
}

export function ConfirmationScreen({ attendeeId, badgeToken }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    generateQRDataURL(badgeToken, process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin)
      .then(setQrDataUrl);
  }, [badgeToken]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="text-5xl">🎉</div>
          <h2 className="text-3xl font-bold text-[#fdf0ee]">You're registered!</h2>
          <p className="text-[rgba(253,240,238,0.55)]">
            Show this QR code at the venue to check in. A confirmation email is on its way.
          </p>
        </div>

        {qrDataUrl ? (
          <div className="mx-auto w-52 h-52 rounded-xl overflow-hidden border border-[rgba(200,16,46,0.3)] p-2 bg-[#fdf0ee]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Your badge QR code" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="mx-auto w-52 h-52 rounded-xl border border-[rgba(200,16,46,0.3)] animate-pulse bg-[rgba(200,16,46,0.1)]" />
        )}

        <div className="flex flex-col gap-3">
          {qrDataUrl && (
            <Button asChild variant="outline" className="border-[#c8102e] text-[#fdf0ee]">
              <a href={qrDataUrl} download="bethehero-badge.png">Save Badge</a>
            </Button>
          )}
          <Button asChild className="bg-[#c8102e] hover:bg-[#ff2442]">
            <Link href="/login">Log in to track your status →</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/register/
git commit -m "feat: registration page with all three states (success/already-exists/no-event)"
```

---

### Task 5: Donor login page

**Files:**
- Create: `src/app/(public)/login/page.tsx`
- Create: `src/app/(public)/login/actions.ts`

- [ ] **Step 1: Write `sendOtp` server action**

```typescript
// src/app/(public)/login/actions.ts
"use server";
import { createSupabaseServerClient } from "@/lib/auth/server";

export async function sendOtp(email: string): Promise<{ error?: string }> {
  if (!email || !email.includes("@")) return { error: "Invalid email" };
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/status`,
    },
  });
  if (error) return { error: error.message };
  return {};
}

export async function verifyOtp(email: string, token: string): Promise<{ error?: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: error.message };
  return {};
}
```

- [ ] **Step 2: Write login page**

```tsx
// src/app/(public)/login/page.tsx
"use client";
import { useState, useTransition } from "react";
import { sendOtp, verifyOtp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await sendOtp(email);
      if (res.error) setError(res.error);
      else setStep("otp");
    });
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await verifyOtp(email, otp);
      if (res.error) setError(res.error);
      else router.push("/status");
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#fdf0ee]">Welcome back</h1>
          <p className="mt-2 text-[rgba(253,240,238,0.55)]">
            {step === "email" ? "Enter your email to receive a login code" : `Check ${email} for your 6-digit code`}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#fdf0ee]">Email</Label>
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)]" />
            </div>
            {error && <p className="text-[#ff2442] text-sm">{error}</p>}
            <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#ff2442]">
              {isPending ? "Sending…" : "Send Login Code →"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-[#fdf0ee]">6-Digit Code</Label>
              <Input id="otp" type="text" inputMode="numeric" pattern="[0-9]{6}" required
                value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456"
                className="bg-transparent border-[rgba(200,16,46,0.3)] text-[#fdf0ee] placeholder:text-[rgba(253,240,238,0.28)] text-center text-2xl tracking-widest" />
            </div>
            {error && <p className="text-[#ff2442] text-sm">{error}</p>}
            <Button type="submit" disabled={isPending} className="w-full bg-[#c8102e] hover:bg-[#ff2442]">
              {isPending ? "Verifying…" : "Verify →"}
            </Button>
            <button type="button" onClick={() => { setStep("email"); setOtp(""); setError(""); }}
              className="w-full text-sm text-[rgba(253,240,238,0.28)] hover:text-[rgba(253,240,238,0.55)]">
              Use a different email
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/login/
git commit -m "feat: donor login page with email OTP (two-step)"
```

---

### Task 6: Donor status polling API + page

**Files:**
- Create: `src/app/api/donor/status/route.ts`
- Create: `src/app/(public)/status/page.tsx`
- Create: `src/components/StatusTimeline.tsx`

- [ ] **Step 1: Write status API endpoint**

```typescript
// src/app/api/donor/status/route.ts
import { NextResponse } from "next/server";
import { requireDonor } from "@/lib/auth/server";
import { getActiveEvent } from "@/lib/db/queries/events";
import { getAttendeeByDonorAndEvent } from "@/lib/db/queries/attendees";

export async function GET() {
  try {
    const { donorId } = await requireDonor();
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ attendee: null, event: null });

    const attendee = await getAttendeeByDonorAndEvent(donorId, event.id);
    return NextResponse.json({ attendee, event });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

- [ ] **Step 2: Write StatusTimeline component**

```tsx
// src/components/StatusTimeline.tsx
const STAGES = ["registered", "confirmed", "checked_in", "donated"] as const;
type Stage = typeof STAGES[number];

const STAGE_LABELS: Record<Stage, string> = {
  registered: "Registered",
  confirmed:  "Confirmed",
  checked_in: "Checked In",
  donated:    "Donated",
};

export function StatusTimeline({ status }: { status: string }) {
  const currentIdx = STAGES.indexOf(status as Stage);

  return (
    <div className="flex items-center gap-2 w-full max-w-sm mx-auto">
      {STAGES.map((stage, idx) => (
        <div key={stage} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${idx < currentIdx  ? "bg-[#c8102e] text-white" : ""}
              ${idx === currentIdx ? "bg-[#ff2442] text-white ring-2 ring-[#ff2442] ring-offset-2 ring-offset-[#070108]" : ""}
              ${idx > currentIdx  ? "bg-[rgba(200,16,46,0.15)] text-[rgba(253,240,238,0.3)]" : ""}
            `}>
              {idx < currentIdx ? "✓" : idx + 1}
            </div>
            <span className={`text-[10px] whitespace-nowrap ${idx === currentIdx ? "text-[#ff2442]" : "text-[rgba(253,240,238,0.3)]"}`}>
              {STAGE_LABELS[stage]}
            </span>
          </div>
          {idx < STAGES.length - 1 && (
            <div className={`flex-1 h-0.5 mb-5 ${idx < currentIdx ? "bg-[#c8102e]" : "bg-[rgba(200,16,46,0.15)]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write status page with polling**

```tsx
// src/app/(public)/status/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { StatusTimeline } from "@/components/StatusTimeline";
import { DonationCelebration } from "@/components/DonationCelebration";
import { Button } from "@/components/ui/button";
import Link from "next/link";

async function fetchStatus() {
  const res = await fetch("/api/donor/status");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function StatusPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["donorStatus"],
    queryFn: fetchStatus,
    refetchInterval: 20_000, // poll every 20s
  });

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070108]">
        <div className="animate-pulse text-[rgba(253,240,238,0.3)]">Loading…</div>
      </main>
    );
  }

  if (error || !data?.attendee) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
        <div className="text-center space-y-4">
          <p className="text-[rgba(253,240,238,0.55)]">No active registration found.</p>
          <Button asChild className="bg-[#c8102e] hover:bg-[#ff2442]">
            <Link href="/register">Register Now</Link>
          </Button>
        </div>
      </main>
    );
  }

  const { attendee, event } = data;

  if (attendee.status === "donated") {
    return <DonationCelebration attendeeId={attendee.id} />;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-sm w-full space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-bold text-[#fdf0ee]">Your Donation Status</h1>
          <p className="text-[rgba(253,240,238,0.55)] mt-1">{event.name}</p>
        </div>

        <StatusTimeline status={attendee.status} />

        <div className="text-sm text-[rgba(253,240,238,0.3)]">
          {event.venue} · {new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild variant="outline" className="border-[rgba(200,16,46,0.3)] text-[#fdf0ee]">
            <Link href="/history">View donation history</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Write DonationCelebration component**

```tsx
// src/components/DonationCelebration.tsx
"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function DonationCelebration({ attendeeId }: { attendeeId: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="text-7xl">👑</div>
        <div>
          <h2 className="text-3xl font-bold text-[#fdf0ee]">You're a Hero!</h2>
          <p className="mt-2 text-[rgba(253,240,238,0.55)]">
            Thank you for donating blood. Your gift saves lives.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button asChild className="bg-[#c8102e] hover:bg-[#ff2442]">
            <Link href={`/certificate/${attendeeId}`}>Download Certificate</Link>
          </Button>
          <Button asChild variant="outline" className="border-[rgba(200,16,46,0.3)] text-[#fdf0ee]">
            <Link href={`/feedback/${attendeeId}`}>Share Feedback</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/donor/ src/app/\(public\)/status/ src/components/StatusTimeline.tsx src/components/DonationCelebration.tsx
git commit -m "feat: donor status page with 20s polling and donation celebration"
```

---

### Task 7: Donation history page

**Files:**
- Create: `src/app/api/donor/history/route.ts`
- Create: `src/app/(public)/history/page.tsx`

- [ ] **Step 1: Write history API endpoint**

```typescript
// src/app/api/donor/history/route.ts
import { NextResponse } from "next/server";
import { requireDonor } from "@/lib/auth/server";
import { getAttendeesByDonor } from "@/lib/db/queries/attendees";

export async function GET() {
  try {
    const { donorId } = await requireDonor();
    const attendees = await getAttendeesByDonor(donorId);
    return NextResponse.json({ attendees });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

- [ ] **Step 2: Write history page**

```tsx
// src/app/(public)/history/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Link from "next/link";

async function fetchHistory() {
  const res = await fetch("/api/donor/history");
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

const STATUS_BADGE: Record<string, string> = {
  registered: "bg-blue-500/20 text-blue-300",
  confirmed:  "bg-yellow-500/20 text-yellow-300",
  checked_in: "bg-orange-500/20 text-orange-300",
  donated:    "bg-green-500/20 text-green-300",
  deferred:   "bg-red-500/20 text-red-300",
  no_show:    "bg-gray-500/20 text-gray-400",
};

export default function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["donorHistory"], queryFn: fetchHistory });

  if (isLoading) {
    return <main className="min-h-screen flex items-center justify-center bg-[#070108]">
      <div className="animate-pulse text-[rgba(253,240,238,0.3)]">Loading…</div>
    </main>;
  }

  const attendees: any[] = data?.attendees ?? [];

  return (
    <main className="min-h-screen p-6 bg-[#070108]">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-[#fdf0ee]">Donation History</h1>

        {attendees.length === 0 ? (
          <p className="text-[rgba(253,240,238,0.55)]">No donation history yet.</p>
        ) : (
          <div className="space-y-4">
            {attendees.map((a: any) => (
              <div key={a.id} className="border border-[rgba(200,16,46,0.2)] rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-[#fdf0ee]">{a.event?.name}</p>
                    <p className="text-sm text-[rgba(253,240,238,0.55)]">{a.event?.venue}</p>
                    <p className="text-xs text-[rgba(253,240,238,0.3)]">
                      {new Date(a.event?.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_BADGE[a.status] ?? ""}`}>
                    {a.status.replace("_", " ")}
                  </span>
                </div>
                {a.status === "donated" && (
                  <Button asChild size="sm" className="bg-[#c8102e] hover:bg-[#ff2442]">
                    <Link href={`/certificate/${a.id}`}>Download Certificate</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/donor/history/ src/app/\(public\)/history/
git commit -m "feat: donation history page"
```

---

### Task 8: Certificate page (on-the-fly PDF)

**Files:**
- Create: `src/app/(public)/certificate/[attendeeId]/page.tsx`
- Create: `src/app/(public)/certificate/[attendeeId]/CertificatePDF.tsx`
- Create: `src/app/api/donor/certificate/[attendeeId]/route.ts`

- [ ] **Step 1: Write certificate data API (server verifies ownership)**

```typescript
// src/app/api/donor/certificate/[attendeeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireDonor } from "@/lib/auth/server";
import { getAttendeeById } from "@/lib/db/queries/attendees";

export async function GET(_req: NextRequest, { params }: { params: { attendeeId: string } }) {
  try {
    const { donorId } = await requireDonor();
    const attendee = await getAttendeeById(params.attendeeId);
    if (!attendee) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (attendee.donorId !== donorId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (attendee.status !== "donated") return NextResponse.json({ error: "Certificate not available yet" }, { status: 403 });
    return NextResponse.json({ attendee });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

- [ ] **Step 2: Write CertificatePDF component**

```tsx
// src/app/(public)/certificate/[attendeeId]/CertificatePDF.tsx
"use client";
import {
  Document, Page, Text, View, Image, StyleSheet, PDFDownloadLink,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#fff", padding: 48, flexDirection: "column", gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 80, height: 40, objectFit: "contain" },
  title: { fontSize: 22, fontWeight: "bold", color: "#c8102e", textAlign: "center", marginVertical: 12 },
  subtitle: { fontSize: 12, color: "#555", textAlign: "center" },
  divider: { borderBottom: "1 solid #e0c8c8", marginVertical: 12 },
  label: { fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: 1 },
  value: { fontSize: 14, color: "#111", marginTop: 2, marginBottom: 10 },
  footer: { flexDirection: "row", justifyContent: "space-around", marginTop: 24 },
  signatory: { alignItems: "center" },
  sigLine: { borderTop: "1 solid #aaa", width: 120, marginBottom: 4 },
  sigName: { fontSize: 10, fontWeight: "bold" },
  sigTitle: { fontSize: 9, color: "#666" },
});

interface CertData {
  attendee: {
    certificateNumber: string;
    bloodGroupAtEvent: string;
    donatedAt: string;
    donor: { fullName: string; company: string };
    event: {
      name: string; venue: string; startAt: string;
      organiserName: string; bloodBankName: string;
      organiserSignatoryName: string; organiserSignatoryTitle: string;
      bloodBankSignatoryName: string; bloodBankSignatoryTitle: string;
    };
  };
}

function CertDocument({ data }: { data: CertData }) {
  const { attendee } = data;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image style={styles.logo} src="/images/confluxsys.png" />
          <Image style={styles.logo} src="/images/janakalyan.png" />
        </View>
        <View style={styles.divider} />

        <Text style={styles.title}>Certificate of Blood Donation</Text>
        <Text style={styles.subtitle}>This certifies that the following individual has donated blood</Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Donor Name</Text>
        <Text style={styles.value}>{attendee.donor.fullName}</Text>

        <Text style={styles.label}>Company</Text>
        <Text style={styles.value}>{attendee.donor.company || "—"}</Text>

        <Text style={styles.label}>Blood Group</Text>
        <Text style={styles.value}>{attendee.bloodGroupAtEvent}</Text>

        <Text style={styles.label}>Event</Text>
        <Text style={styles.value}>{attendee.event.name}</Text>

        <Text style={styles.label}>Venue</Text>
        <Text style={styles.value}>{attendee.event.venue}</Text>

        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>{new Date(attendee.event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</Text>

        <Text style={styles.label}>Certificate No.</Text>
        <Text style={styles.value}>{attendee.certificateNumber}</Text>

        <View style={styles.divider} />

        <View style={styles.footer}>
          <View style={styles.signatory}>
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>{attendee.event.organiserSignatoryName}</Text>
            <Text style={styles.sigTitle}>{attendee.event.organiserSignatoryTitle}</Text>
          </View>
          <View style={styles.signatory}>
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>{attendee.event.bloodBankSignatoryName}</Text>
            <Text style={styles.sigTitle}>{attendee.event.bloodBankSignatoryTitle}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function CertificateDownloadButton({ data }: { data: CertData }) {
  return (
    <PDFDownloadLink
      document={<CertDocument data={data} />}
      fileName={`certificate-${data.attendee.certificateNumber}.pdf`}
      className="inline-flex items-center justify-center rounded-md bg-[#c8102e] hover:bg-[#ff2442] text-white font-semibold px-6 py-3 text-sm transition-colors"
    >
      {({ loading }) => loading ? "Generating PDF…" : "Download Certificate (PDF)"}
    </PDFDownloadLink>
  );
}
```

- [ ] **Step 3: Write certificate page**

```tsx
// src/app/(public)/certificate/[attendeeId]/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { CertificateDownloadButton } from "./CertificatePDF";
import { useParams } from "next/navigation";

export default function CertificatePage() {
  const { attendeeId } = useParams<{ attendeeId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["certificate", attendeeId],
    queryFn: async () => {
      const res = await fetch(`/api/donor/certificate/${attendeeId}`);
      if (!res.ok) throw new Error("Certificate not available");
      return res.json();
    },
  });

  if (isLoading) return (
    <main className="min-h-screen flex items-center justify-center bg-[#070108]">
      <div className="animate-pulse text-[rgba(253,240,238,0.3)]">Loading certificate…</div>
    </main>
  );

  if (error) return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <p className="text-[#ff2442]">Certificate not available. Make sure you are logged in and have donated.</p>
    </main>
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-sm w-full text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#fdf0ee]">Your Certificate</h1>
          <p className="text-[rgba(253,240,238,0.55)] mt-1">Certificate #{data.attendee.certificateNumber}</p>
        </div>
        <CertificateDownloadButton data={data} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/certificate/ src/app/api/donor/certificate/
git commit -m "feat: certificate page with on-the-fly PDF download via @react-pdf/renderer"
```

---

### Task 9: Feedback form

**Files:**
- Create: `src/app/(public)/feedback/[attendeeId]/page.tsx`
- Create: `src/app/(public)/feedback/[attendeeId]/actions.ts`

- [ ] **Step 1: Write submitFeedback server action**

```typescript
// src/app/(public)/feedback/[attendeeId]/actions.ts
"use server";
import { z } from "zod";
import { requireDonor } from "@/lib/auth/server";
import { getAttendeeById } from "@/lib/db/queries/attendees";
import { db } from "@/lib/db/index";
import { feedback } from "@/lib/db/schema";

const FeedbackSchema = z.object({
  attendeeId:      z.string().uuid(),
  rating:          z.coerce.number().int().min(1).max(5),
  comment:         z.string().max(500).optional(),
  wouldDonateAgain: z.boolean().optional(),
});

export async function submitFeedback(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  try {
    const { donorId } = await requireDonor();
    const parsed = FeedbackSchema.safeParse({
      attendeeId:      formData.get("attendeeId"),
      rating:          formData.get("rating"),
      comment:         formData.get("comment") || undefined,
      wouldDonateAgain: formData.get("wouldDonateAgain") === "yes" ? true : formData.get("wouldDonateAgain") === "no" ? false : undefined,
    });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const attendee = await getAttendeeById(parsed.data.attendeeId);
    if (!attendee || attendee.donorId !== donorId) return { error: "Forbidden" };
    if (attendee.status !== "donated") return { error: "Feedback is only for completed donations" };

    await db.insert(feedback).values(parsed.data).onConflictDoNothing();
    return { success: true };
  } catch {
    return { error: "Authentication required" };
  }
}
```

- [ ] **Step 2: Write feedback page**

```tsx
// src/app/(public)/feedback/[attendeeId]/page.tsx
"use client";
import { useState, useTransition } from "react";
import { submitFeedback } from "./actions";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import Link from "next/link";

const RATINGS = [1,2,3,4,5] as const;

export default function FeedbackPage() {
  const { attendeeId } = useParams<{ attendeeId: string }>();
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("attendeeId", attendeeId);
    formData.set("rating", String(rating));
    startTransition(async () => {
      const res = await submitFeedback(formData);
      if (res.error) setError(res.error);
      else setSubmitted(true);
    });
  }

  if (submitted) return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="text-center space-y-4">
        <div className="text-5xl">🙏</div>
        <h2 className="text-2xl font-bold text-[#fdf0ee]">Thank you for your feedback!</h2>
        <Button asChild className="bg-[#c8102e] hover:bg-[#ff2442]">
          <Link href="/status">Back to status</Link>
        </Button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#070108]">
      <div className="max-w-sm w-full space-y-6">
        <h1 className="text-2xl font-bold text-[#fdf0ee] text-center">Share Your Experience</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="text-[#fdf0ee] mb-3">How was your experience? *</p>
            <div className="flex gap-3 justify-center">
              {RATINGS.map(r => (
                <button key={r} type="button" onClick={() => setRating(r)}
                  className={`w-12 h-12 rounded-full text-xl transition-all ${rating >= r ? "bg-[#c8102e] scale-110" : "bg-[rgba(200,16,46,0.15)]"}`}>
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <textarea name="comment" rows={3} placeholder="Any comments? (optional)"
              className="w-full rounded-md border border-[rgba(200,16,46,0.3)] bg-transparent text-[#fdf0ee] px-3 py-2 text-sm placeholder:text-[rgba(253,240,238,0.28)] resize-none" />
          </div>

          <div>
            <p className="text-[#fdf0ee] mb-2">Would you donate again?</p>
            <div className="flex gap-3">
              {(["yes","no"] as const).map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="wouldDonateAgain" value={v} className="accent-[#c8102e]" />
                  <span className="text-[rgba(253,240,238,0.55)] capitalize">{v}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-[#ff2442] text-sm">{error}</p>}

          <Button type="submit" disabled={isPending || rating === 0}
            className="w-full bg-[#c8102e] hover:bg-[#ff2442]">
            {isPending ? "Submitting…" : "Submit Feedback →"}
          </Button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/feedback/
git commit -m "feat: feedback form with rating, comment, and would-donate-again"
```

---

### Task 10: Update landing page CTA to /register

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Change `href="#register"` to `href="/register"` in the CTA**

In `src/app/page.tsx`, line ~102, change:

```tsx
<a href="#register" className="cta">
```

to:

```tsx
<a href="/register" className="cta">
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire landing page CTA to /register"
```

---

### Task 11: Verify Phase 2

- [ ] **Step 1: Run dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test registration flow**

Navigate to http://localhost:3000/register. Fill in a new email and submit. Confirm success screen + QR renders.

- [ ] **Step 3: Test login flow**

Navigate to http://localhost:3000/login. Enter a registered email, receive OTP, verify.

- [ ] **Step 4: Test status polling**

After logging in, navigate to http://localhost:3000/status. Confirm attendee status displays.

- [ ] **Step 5: Test history page**

Navigate to http://localhost:3000/history. Confirm donation list renders.

- [ ] **Step 6: Commit any fixes**

```bash
git add .
git commit -m "chore: phase 2 donor flows complete"
```
