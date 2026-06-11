# BeTheHero — Phase 5: Email (SES), Push Notifications, PWA & Cron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phases 1–4 complete. Notification jobs are already being enqueued (Phase 2 registers confirmation; Phase 3 enqueues thank_you + feedback_request on mark-donated).

**Goal:** Wire AWS SES transactional email, web push notifications (VAPID), PWA manifest + service worker, and the Vercel Cron reminder pipeline that drains `notification_jobs`.

**Architecture:** SES client sends branded HTML emails. Push subscriptions are stored in `push_subscriptions`. A cron route (`/api/cron/reminders`) is called hourly by Vercel Cron; it enqueues reminder jobs for attendees within 24h of event start and drains all pending notification jobs. Everything is idempotent via `dedupe_key`.

**Tech Stack:** `@aws-sdk/client-ses`, `web-push` (VAPID), Next.js service worker (static `public/sw.js`).

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/lib/email/ses.ts` | SES client + `sendEmail()` helper |
| `src/lib/email/templates/confirmation.ts` | Confirmation email HTML |
| `src/lib/email/templates/reminder.ts` | Day-before reminder HTML |
| `src/lib/email/templates/thank-you.ts` | Thank-you / donated email HTML |
| `src/lib/email/templates/feedback-request.ts` | Feedback request email HTML |
| `src/lib/push/send.ts` | `sendPushNotification()` via web-push |
| `src/lib/push/subscriptions.ts` | DB helpers for push_subscriptions |
| `src/app/api/cron/reminders/route.ts` | Cron: enqueue reminders + drain pending jobs |
| `src/app/api/push/subscribe/route.ts` | POST — save push subscription |
| `src/app/api/push/unsubscribe/route.ts` | POST — delete push subscription |
| `public/sw.js` | Service worker (push + notificationclick handler) |
| `public/manifest.json` | PWA manifest |
| `vercel.json` | Cron schedule config |

---

### Task 1: Install Phase 5 dependencies

- [ ] **Step 1: Install SES SDK and web-push**

```bash
pnpm add @aws-sdk/client-ses web-push
pnpm add -D @types/web-push
```

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install @aws-sdk/client-ses and web-push"
```

---

### Task 2: SES email client

**Files:**
- Create: `src/lib/email/ses.ts`

- [ ] **Step 1: Write SES client and sendEmail helper**

```typescript
// src/lib/email/ses.ts
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION!,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  await sesClient.send(new SendEmailCommand({
    Source: process.env.SES_FROM_EMAIL!,
    Destination: { ToAddresses: [params.to] },
    Message: {
      Subject: { Data: params.subject, Charset: "UTF-8" },
      Body: {
        Html:  { Data: params.html,          Charset: "UTF-8" },
        ...(params.text ? { Text: { Data: params.text, Charset: "UTF-8" } } : {}),
      },
    },
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/email/ses.ts
git commit -m "feat: AWS SES client and sendEmail helper"
```

---

### Task 3: Email templates

**Files:**
- Create: `src/lib/email/templates/confirmation.ts`
- Create: `src/lib/email/templates/reminder.ts`
- Create: `src/lib/email/templates/thank-you.ts`
- Create: `src/lib/email/templates/feedback-request.ts`

- [ ] **Step 1: Write confirmation template**

```typescript
// src/lib/email/templates/confirmation.ts
interface ConfirmationParams {
  fullName: string;
  eventName: string;
  venue: string;
  address: string;
  startAt: Date;
  badgeToken: string;
  loginUrl: string;
  instructionsDos: string[];
  instructionsDonts: string[];
  appUrl: string;
}

export function confirmationEmailHtml(p: ConfirmationParams): string {
  const dateStr = p.startAt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = p.startAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const badgeUrl = `${p.appUrl}/badge/${p.badgeToken}`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>You're Registered — ${p.eventName}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <tr><td style="background:#c8102e;padding:28px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">🩸 You're Registered!</h1>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">${p.eventName}</p>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="color:#333;font-size:16px;margin:0 0 8px;">Hello <strong>${p.fullName}</strong>,</p>
    <p style="color:#555;font-size:14px;">Thank you for registering! Show the QR code below at the venue to check in.</p>

    <div style="text-align:center;margin:24px 0;padding:20px;background:#fdf0ee;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Your Badge QR</p>
      <a href="${badgeUrl}" style="display:inline-block;background:#c8102e;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">View Badge</a>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;margin:16px 0;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;">📅 Date & Time</p>
        <p style="margin:0;font-size:15px;color:#222;font-weight:bold;">${dateStr} · ${timeStr}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#555;">📍 ${p.venue}<br>${p.address}</p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td width="48%" valign="top" style="padding-right:8px;">
          <p style="margin:0 0 8px;font-size:13px;color:#c8102e;font-weight:bold;">✅ Do's</p>
          ${p.instructionsDos.map(d => `<p style="margin:0 0 5px;font-size:13px;color:#333;">• ${d}</p>`).join("")}
        </td>
        <td width="48%" valign="top" style="padding-left:8px;">
          <p style="margin:0 0 8px;font-size:13px;color:#d97706;font-weight:bold;">❌ Don'ts</p>
          ${p.instructionsDonts.map(d => `<p style="margin:0 0 5px;font-size:13px;color:#333;">• ${d}</p>`).join("")}
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin-top:20px;">
      <a href="${p.loginUrl}" style="display:inline-block;background:#070108;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:13px;">Track My Status</a>
    </div>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#f5f5f5;text-align:center;">
    <p style="margin:0;font-size:11px;color:#aaa;">BeTheHero · Blood Donation Management</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}
```

- [ ] **Step 2: Write reminder template**

```typescript
// src/lib/email/templates/reminder.ts
interface ReminderParams {
  fullName: string;
  eventName: string;
  venue: string;
  startAt: Date;
  badgeToken: string;
  appUrl: string;
}

export function reminderEmailHtml(p: ReminderParams): string {
  const dateStr = p.startAt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = p.startAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:32px 16px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#c8102e;padding:24px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">🩸 Donation Drive Tomorrow!</h1>
  </div>
  <div style="padding:28px 32px;">
    <p style="color:#333;font-size:16px;">Hello <strong>${p.fullName}</strong>,</p>
    <p style="color:#555;font-size:14px;">Your blood donation drive is <strong>tomorrow</strong>. Here's a quick reminder to prepare:</p>
    <ul style="color:#333;font-size:14px;line-height:1.8;">
      <li>Eat a proper, balanced meal 2–3 hours before donating</li>
      <li>Drink plenty of water — stay well hydrated</li>
      <li>Get a good night's sleep tonight</li>
      <li>Avoid alcohol and smoking before donating</li>
      <li>Carry a valid photo ID</li>
    </ul>
    <p style="color:#555;font-size:14px;"><strong>📅 ${dateStr} at ${timeStr}</strong><br>📍 ${p.venue}</p>
    <div style="text-align:center;margin-top:20px;">
      <a href="${p.appUrl}/badge/${p.badgeToken}" style="background:#c8102e;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">View My Badge</a>
    </div>
  </div>
</div></body></html>`;
}
```

- [ ] **Step 3: Write thank-you template**

```typescript
// src/lib/email/templates/thank-you.ts
interface ThankYouParams {
  fullName: string;
  eventName: string;
  certificateUrl: string;
  appUrl: string;
}

export function thankYouEmailHtml(p: ThankYouParams): string {
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:32px 16px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#c8102e;padding:24px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">👑 You're a Hero, ${p.fullName}!</h1>
  </div>
  <div style="padding:28px 32px;text-align:center;">
    <p style="color:#333;font-size:16px;margin:0 0 12px;">Thank you for donating blood at <strong>${p.eventName}</strong>.</p>
    <p style="color:#555;font-size:14px;margin:0 0 24px;">Your donation can save up to 3 lives. You are truly a hero.</p>
    <a href="${p.certificateUrl}" style="background:#c8102e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;">Download My Certificate</a>
    <p style="color:#aaa;font-size:12px;margin-top:20px;">See you at the next drive! ❤️</p>
  </div>
</div></body></html>`;
}
```

- [ ] **Step 4: Write feedback-request template**

```typescript
// src/lib/email/templates/feedback-request.ts
interface FeedbackRequestParams {
  fullName: string;
  feedbackUrl: string;
}

export function feedbackRequestEmailHtml(p: FeedbackRequestParams): string {
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:32px 16px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#c8102e;padding:24px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">How was your experience?</h1>
  </div>
  <div style="padding:28px 32px;text-align:center;">
    <p style="color:#333;font-size:15px;">Hi <strong>${p.fullName}</strong>, we'd love your feedback on the blood donation drive.</p>
    <p style="color:#555;font-size:14px;margin-bottom:24px;">It takes just 30 seconds and helps us improve.</p>
    <a href="${p.feedbackUrl}" style="background:#c8102e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;">Give Feedback</a>
  </div>
</div></body></html>`;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/
git commit -m "feat: SES email templates (confirmation, reminder, thank-you, feedback-request)"
```

---

### Task 4: Web push helpers

**Files:**
- Create: `src/lib/push/send.ts`
- Create: `src/lib/push/subscriptions.ts`

- [ ] **Step 1: Write push sender**

```typescript
// src/lib/push/send.ts
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
  );
}
```

- [ ] **Step 2: Write push subscription DB helpers**

```typescript
// src/lib/push/subscriptions.ts
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { pushSubscriptions } from "@/lib/db/schema";

export async function savePushSubscription(params: {
  donorId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
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
```

- [ ] **Step 3: Create push subscribe/unsubscribe routes**

```typescript
// src/app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireDonor } from "@/lib/auth/server";
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
    await savePushSubscription({
      donorId,
      ...parsed,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
```

```typescript
// src/app/api/push/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deletePushSubscription } from "@/lib/push/subscriptions";

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    await deletePushSubscription(endpoint);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/push/ src/app/api/push/
git commit -m "feat: web push helpers (VAPID send, subscribe/unsubscribe routes)"
```

---

### Task 5: Cron reminder pipeline

**Files:**
- Create: `src/app/api/cron/reminders/route.ts`

- [ ] **Step 1: Write the cron route**

```typescript
// src/app/api/cron/reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/index";
import { eventAttendees, events, notificationJobs } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { enqueueNotification, getPendingNotifications, markNotificationSent, markNotificationFailed } from "@/lib/db/queries/notifications";
import { sendEmail } from "@/lib/email/ses";
import { confirmationEmailHtml } from "@/lib/email/templates/confirmation";
import { reminderEmailHtml } from "@/lib/email/templates/reminder";
import { thankYouEmailHtml } from "@/lib/email/templates/thank-you";
import { feedbackRequestEmailHtml } from "@/lib/email/templates/feedback-request";
import { sendPushNotification } from "@/lib/push/send";
import { getPushSubscriptionsByDonor } from "@/lib/push/subscriptions";

function verifyCronSecret(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // 1. Enqueue day-before reminders for upcoming events
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 25 * 60 * 60 * 1000); // within 25h
  const upcoming = await db.query.events.findMany({
    where: and(
      eq(events.status, "active"),
      gte(events.startAt, now),
      lte(events.startAt, tomorrow),
    ),
    with: {
      attendees: {
        where: eq(eventAttendees.status, "registered"),
        with: { donor: true },
      },
    },
  });

  for (const event of upcoming) {
    for (const attendee of (event as any).attendees) {
      await enqueueNotification({
        attendeeId:  attendee.id,
        type:        "reminder_day_before",
        channel:     "email",
        scheduledAt: new Date(),
        dedupeKey:   `reminder-email-${attendee.id}`,
      });
    }
  }

  // 2. Drain all pending notification jobs
  const pending = await getPendingNotifications();
  let sent = 0, failed = 0;

  for (const job of pending) {
    const attendee = (job as any).attendee;
    const donor    = attendee?.donor;
    const event    = attendee?.event;
    if (!donor || !event) { await markNotificationFailed(job.id, "Missing donor or event"); failed++; continue; }

    try {
      if (job.channel === "email") {
        let subject = "";
        let html = "";

        switch (job.type) {
          case "confirmation":
            subject = `You're registered for ${event.name}!`;
            html = confirmationEmailHtml({
              fullName: donor.fullName,
              eventName: event.name,
              venue: event.venue,
              address: event.address,
              startAt: new Date(event.startAt),
              badgeToken: attendee.badgeToken,
              loginUrl: `${appUrl}/login`,
              instructionsDos:   (event.instructionsDos  as string[]) ?? [],
              instructionsDonts: (event.instructionsDonts as string[]) ?? [],
              appUrl,
            });
            break;
          case "reminder_day_before":
            subject = `Reminder: ${event.name} is tomorrow!`;
            html = reminderEmailHtml({
              fullName: donor.fullName,
              eventName: event.name,
              venue: event.venue,
              startAt: new Date(event.startAt),
              badgeToken: attendee.badgeToken,
              appUrl,
            });
            break;
          case "thank_you":
            subject = `Thank you, ${donor.fullName}! Your certificate is ready.`;
            html = thankYouEmailHtml({
              fullName: donor.fullName,
              eventName: event.name,
              certificateUrl: `${appUrl}/certificate/${attendee.id}`,
              appUrl,
            });
            break;
          case "feedback_request":
            subject = "How was your donation experience?";
            html = feedbackRequestEmailHtml({
              fullName: donor.fullName,
              feedbackUrl: `${appUrl}/feedback/${attendee.id}`,
            });
            break;
          default:
            await markNotificationFailed(job.id, `Unhandled type: ${job.type}`);
            failed++;
            continue;
        }

        await sendEmail({ to: donor.email, subject, html });
      } else if (job.channel === "push") {
        const subscriptions = await getPushSubscriptionsByDonor(donor.id);
        for (const sub of subscriptions) {
          await sendPushNotification(sub, {
            title: event.name,
            body:  job.type === "reminder_day_before" ? "Donation drive is tomorrow!" : "Update from BeTheHero",
            url:   `${appUrl}/status`,
          });
        }
      }

      await markNotificationSent(job.id);
      sent++;
    } catch (e: any) {
      await markNotificationFailed(job.id, e.message ?? "Unknown error");
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, pendingCount: pending.length });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/reminders/
git commit -m "feat: cron reminder pipeline (enqueue day-before + drain all pending jobs)"
```

---

### Task 6: Vercel Cron config

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Add Vercel Cron to vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

Vercel sets the `Authorization: Bearer <CRON_SECRET>` header automatically when calling cron routes.

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: add Vercel Cron config (hourly reminders)"
```

---

### Task 7: PWA — manifest + service worker

**Files:**
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Modify: `src/app/layout.tsx` (add manifest link)

- [ ] **Step 1: Create PWA manifest**

```json
{
  "name": "BeTheHero — Blood Donation Drive",
  "short_name": "BeTheHero",
  "description": "Register for and track your blood donation",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#070108",
  "theme_color": "#c8102e",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Note: create placeholder icons at `public/icons/icon-192.png` and `public/icons/icon-512.png` (any PNG, replace with real icons before launch).

- [ ] **Step 2: Create service worker**

```javascript
// public/sw.js
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: "BeTheHero", body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "BeTheHero", {
      body:  data.body ?? "",
      icon:  "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data:  { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(clients.openWindow(url));
});
```

- [ ] **Step 3: Register service worker + add manifest link**

Add to `src/app/layout.tsx` `<head>`:

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#c8102e" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

Add a `ServiceWorkerRegistrar` client component that registers the SW on mount:

```tsx
// src/components/ServiceWorkerRegistrar.tsx
"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);
  return null;
}
```

Import and render `<ServiceWorkerRegistrar />` in the root layout body.

- [ ] **Step 4: Create placeholder icons directory**

```bash
mkdir -p public/icons
# Copy any 192×192 and 512×512 PNG to public/icons/icon-192.png and icon-512.png
# For now, create simple placeholders:
cp public/vercel.svg public/icons/icon-192.png 2>/dev/null || true
cp public/vercel.svg public/icons/icon-512.png 2>/dev/null || true
```

- [ ] **Step 5: Commit**

```bash
git add public/manifest.json public/sw.js public/icons/ src/components/ServiceWorkerRegistrar.tsx src/app/layout.tsx
git commit -m "feat: PWA manifest + service worker with push handler"
```

---

### Task 8: Generate VAPID keys (one-time setup)

- [ ] **Step 1: Generate VAPID keys**

```bash
node -e "const wp = require('web-push'); const k = wp.generateVAPIDKeys(); console.log('Public:', k.publicKey); console.log('Private:', k.privateKey);"
```

Expected: two base64url-encoded strings printed.

- [ ] **Step 2: Add keys to .env.local**

Copy the printed public and private keys into `.env.local`:

```
VAPID_PUBLIC_KEY=<paste public key here>
VAPID_PRIVATE_KEY=<paste private key here>
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

- [ ] **Step 3: Note in .env.local.example that these are generated once**

```bash
git add .env.local.example
git commit -m "docs: note VAPID key generation in env example"
```

---

### Task 9: Verify Phase 5

- [ ] **Step 1: Run dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test cron endpoint manually**

```bash
curl -H "Authorization: Bearer <your-CRON_SECRET>" http://localhost:3000/api/cron/reminders
```

Expected: `{"ok":true,"sent":N,"failed":0,...}` — confirmation jobs for seeded attendees should be sent.

- [ ] **Step 3: Test PWA install**

Open http://localhost:3000 in Chrome. Check DevTools → Application → Manifest. Confirm manifest is valid.

Check DevTools → Application → Service Workers. Confirm `sw.js` is registered.

- [ ] **Step 4: Verify SES sends**

With real SES credentials in `.env.local`, run the cron and check the inbox of a seeded donor email.

- [ ] **Step 5: Commit any fixes**

```bash
git add .
git commit -m "chore: phase 5 email/push/PWA/cron complete"
```

---

## Full App Checklist (post Phase 5)

- [x] Donor registers at `/register` → confirmation screen + badge QR
- [x] Existing donor → login CTA; no active event → warm thank-you screen
- [x] Auth callback links donor to Supabase session
- [x] Donor status page polls every 20s; shows celebration on `donated`
- [x] Certificate rendered on-the-fly client-side, never stored
- [x] Feedback form — one submission per attendee
- [x] Admin login — allowlisted only, audit-logged
- [x] Admin event create / activate / close / set-active drive
- [x] Admin QR scanner resolves badge → check-in + mark donated
- [x] Admin attendees table — all status transitions + audit log
- [x] Admin donor directory with search
- [x] Dashboard: KPI cards + charts, polled every 12s
- [x] Per-event Excel (2 sheets) and PDF reports, in-memory, never stored
- [x] SES emails: confirmation, reminder, thank-you, feedback-request
- [x] Web push: service worker, subscribe/unsubscribe, VAPID send
- [x] Cron: hourly day-before reminders + drain all pending jobs, idempotent
- [x] PWA: manifest, standalone, theme color, push-capable
- [x] Service role key never in client bundle
- [x] All donor DB queries scoped by donorId (server enforced)
