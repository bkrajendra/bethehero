# Blood Donation Drive — Production Build Spec & Prompt

> **Instruction to the implementing agent (Claude Code):** Build the application described below end‑to‑end. This is a single‑organization, single‑active‑event‑at‑a‑time system. Treat every section as a hard requirement unless marked `CONFIRM` (an open product decision — implement the stated default but isolate it so it's easy to change). Prioritize correct **data isolation** and **auth boundaries** over feature breadth: this app stores personal and health‑adjacent data and must be handled professionally. Write clean, typed, testable code. Do not expose the Supabase service role key to the client. Do not invent fields that aren't specified.

---

## 1. Product overview

A web app for running corporate/community blood donation drives for **one organization**. Donors register seamlessly at `/register` (reached directly, from the organisation's existing landing page, or from a printed QR that simply points to `/register` — no parameters), receive a personal event badge, get reminders, show their badge at the venue, and download a certificate after donating. Admins create/manage events, scan badges to check people in, capture blood group at the event, mark donations, and view a live analytics dashboard.

### Core principles
1. **Seamless registration** — a brand‑new donor never logs in to register. They fill a short form and immediately get their confirmation + badge.
2. **Auth only on return** — viewing stored data again (status, history, certificate) or being an already‑existing donor requires email OTP / magic link.
3. **Strict isolation** — a donor can only ever read/write their own data. Admin power lives server‑side only.
4. **One active event** — the whole app is scoped to the admin's currently selected event. No multi‑tenancy.
5. **Minimal, modern UI** with subtle blood‑donation theming and tasteful animation. PWA with push notifications.

---

## 2. Tech stack

- **Framework:** Next.js (App Router, TypeScript, Server Actions + Route Handlers).
- **Hosting:** Vercel. Cron via Vercel Cron.
- **DB:** Supabase Postgres, used **only as Postgres + Auth**. The **Data API (PostgREST) is disabled** and **Realtime and Storage are not used**. **All** database access goes through **Drizzle over a direct/pooled Postgres connection on the server** (drizzle‑kit migrations). The browser never queries the database directly — it talks only to Supabase Auth (for sessions) and to this app's own Next.js server (route handlers / server actions). **No RLS** is relied upon for enforcement (Drizzle connects with a role that bypasses RLS); **data isolation is enforced entirely in server code** (see §5).
- **Auth:** Supabase Auth (email OTP + magic link). Configure Supabase Auth SMTP to use **AWS SES** so auth emails are branded and deliverable.
- **Transactional email:** **AWS SES** SDK directly (confirmation, reminders, thank‑you, certificate, feedback). Supabase native email is used *only* for the auth OTP/magic‑link mails.
- **UI:** Tailwind, **shadcn/ui** components, **Base UI** primitives for complex interactive components, Lucide icons, Framer Motion for animation, Recharts for charts.
- **PDF:** `@react-pdf/renderer` (certificates + PDF reports), rendered **on demand** — client‑side for direct download, in‑memory server‑side only when emailing. **Nothing is persisted to object storage.** **XLSX:** `exceljs` (Excel reports, generated in‑memory on request).
- **QR:** `qrcode` for generation; `@zxing/browser` (or `html5-qrcode`) for the admin scanner.
- **Validation:** Zod on every server action / route handler. **Push:** Web Push (VAPID) + service worker.
- **State/query:** TanStack Query v5 for client data fetching; live‑ish views (dashboard, donor status) use **interval polling** (`refetchInterval`) against REST endpoints — **no websockets / Supabase Realtime**.

### Suggested structure (single app)
```
/app
  /(public)            # donor-facing: register, status, login, certificate
  /admin               # admin panel (gated)
  /api                 # route handlers: ses webhooks, cron, push, qr resolve
/lib
  /db                  # drizzle schema, client, queries
  /auth                # supabase auth server/client helpers (session only), admin guard
  /email               # SES client + templates
  /push                # web-push send + subscription mgmt
  /pdf                 # certificate + report renderers
  /qr                  # token gen/resolve
/components            # shadcn + Base UI components
/public                # manifest, icons, sw.js
```
`CONFIRM`: single Next app (recommended) vs. Turborepo monorepo. Default: single app.

---

## 3. Environment & config

```
DATABASE_URL=                      # Supabase pooled connection (Drizzle)
DIRECT_URL=                        # direct connection for migrations
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # server only, NEVER shipped to client
AWS_SES_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_FROM_EMAIL=                    # verified sender / domain
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=                     # mailto: contact
CRON_SECRET=                       # protects cron route handlers
ADMIN_ALLOWLIST=                   # comma-separated admin emails (bootstrap)
NEXT_PUBLIC_APP_URL=
```

---

## 4. Data model (Drizzle / Postgres)

Use `citext` for email. Enums via `pgEnum`. All tables: `id uuid default gen_random_uuid()`, `created_at`, `updated_at`.

### Enums
- `attendee_status`: `registered`, `confirmed`, `checked_in`, `donated`, `deferred`, `no_show`
- `event_status`: `draft`, `active`, `closed`
- `blood_group`: `A+ A- B+ B- AB+ AB- O+ O-`
- `notification_type`: `confirmation`, `reminder_day_before`, `thank_you`, `feedback_request`, `certificate`
- `notification_channel`: `email`, `push`
- `admin_role`: `super`, `scanner`

### Tables

**`donors`** — the person (identity‑independent until they verify)
- `id` uuid pk
- `auth_user_id` uuid null, fk → `auth.users.id` (linked on first OTP/magic‑link verification)
- `email` citext unique not null
- `email_verified` boolean default false
- `mobile` text not null
- `full_name` text not null
- `blood_group` blood_group null            # may be captured later at event
- `dob` date null
- `company` text null                        # captured on registration form (optional), editable by admin at event
- `consent_given` boolean default false      # DPDP
- `consent_at` timestamptz null
- `consent_version` text null
- timestamps

**`events`**
- `id` uuid pk
- `name`, `venue`, `address` text
- `start_at`, `end_at` timestamptz          # badge invalid after `end_at`
- `donation_open_at`, `donation_close_at` timestamptz null   # on-day window
- `status` event_status default 'draft'
- `instructions_dos` jsonb, `instructions_donts` jsonb       # per-event, fallback to app_settings defaults
- `organiser_name`, `blood_bank_name` text   # logos are static files in /public/images (confluxsys.png, janakalyan.png), not stored in DB
- `organiser_signatory_name`, `organiser_signatory_title` text
- `blood_bank_signatory_name`, `blood_bank_signatory_title` text
- timestamps

**`event_attendees`** — the heart of the app (one row per donor per event)
- `id` uuid pk
- `event_id` uuid fk → events
- `donor_id` uuid fk → donors
- `status` attendee_status default 'registered'
- `badge_token` text unique not null         # opaque, random (nanoid 24+), printed in QR
- `blood_group_at_event` blood_group null     # captured by admin at venue
- `donation_volume_ml` integer null
- `deferral_reason` text null
- `checked_in_at` timestamptz null, `checked_in_by` uuid null fk → admins
- `donated_at` timestamptz null, `marked_by` uuid null fk → admins
- `certificate_number` text unique null, `certificate_issued_at` timestamptz null
- timestamps
- **unique (`event_id`, `donor_id`)**
- Index on `badge_token`, on (`event_id`,`status`).

> A donor accumulates many `event_attendees` rows across events (full history). The "one event at a time" rule means they appear once per event; the *current* event is whichever the admin has selected/activated.

**`admins`**
- `id` uuid pk, `auth_user_id` uuid fk → auth.users, `email` citext unique, `name`, `role` admin_role default 'scanner', `active` boolean default true

**`notification_jobs`** — reminder/notification pipeline
- `id`, `attendee_id` fk, `type` notification_type, `channel` notification_channel
- `scheduled_at` timestamptz, `sent_at` timestamptz null, `status` (`pending|sent|failed|skipped`), `error` text null, `dedupe_key` text unique

**`push_subscriptions`**
- `id`, `donor_id` fk, `endpoint` text unique, `p256dh` text, `auth` text, `user_agent` text null, timestamps

**`feedback`**
- `id`, `attendee_id` fk unique, `rating` smallint (1–5), `comment` text null, `would_donate_again` boolean null, `created_at`

**`audit_log`** — every admin mutation
- `id`, `actor_admin_id` fk, `action` text, `target_table` text, `target_id` uuid, `metadata` jsonb, `created_at`

**`app_settings`** — single row
- `id` (singleton), `current_event_id` uuid null fk → events, `default_instructions_dos` jsonb, `default_instructions_donts` jsonb, default org/cert fields, timestamps

---

## 5. Security model (server‑authoritative — no RLS)

**The database is never reached from the browser.** The only client‑side Supabase interaction is **Auth** (obtaining/refreshing a session). Every read and write to application tables happens **server‑side via Drizzle**, which connects with a Postgres role that **bypasses RLS**. Therefore **RLS is not the enforcement mechanism** — *all* authorization is enforced in server code. RLS may optionally be left enabled as inert defense‑in‑depth, but the spec assumes server‑side checks are the gate.

**Two access roles, both enforced in the Next.js server layer:**

1. **Donor scope.** Every donor‑facing route handler / server action first resolves the caller's identity from the **Supabase session** (read + verify via `@supabase/ssr` `getUser()` — an Auth call, not a DB call), giving `auth.uid()` and email. It then loads the matching `donors` row by `auth_user_id` and **scopes every query to that donor's own `id`**. A donor can never receive another donor's data because the server never issues a query that isn't filtered by their own id. Reusable helper: `requireDonor()` → returns `{ donorId, authUserId, email }` or 401.

2. **Admin scope.** Admin routes are gated by `requireAdmin()` (verify session → confirm email is in the `admins` allowlist and `active`). Admins query **across all donors/attendees** by design — the "users can't access other users' data" rule constrains **only the donor scope, never admins**. Admins can see and edit every donor's full data and history.

### Enforcement rules (apply to every server entry point)
- **No unscoped donor query.** Donor reads/writes always carry a `where donor_id = :callerDonorId` (or the attendee belongs to that donor). Code‑review/lint for any donor query missing the scope.
- **Registration insert** is a server action: validates, checks email uniqueness, inserts `donors` (+ attendee for the active event). No client write path exists.
- **Profile update** (donor): only `full_name, mobile, company, blood_group, dob` are mutable by the donor; **email is immutable**.
- **Badge tokens** are opaque random strings (nanoid ≥24), never sequential. A scanned token is resolvable **only** through an `requireAdmin()` route that returns the minimum PII needed for check‑in.
- **Rate limit** registration, OTP request, and QR‑resolve endpoints (per‑IP + per‑email).
- **Zod‑validate** every input. Normalize + lowercase emails (citext).
- **Audit log** every admin mutation (check‑in, mark donated, edit donor, create/close/switch/set‑active event).
- **Minimize PII** in QR payloads and any scan response. Never put email/DoB in a QR.
- **Secrets:** `SUPABASE_SERVICE_ROLE_KEY` (used only for admin‑level Auth operations like linking users) and `DATABASE_URL` are server‑only; never shipped to the client.
- **DPDP (India):** capture explicit consent at registration (checkbox + stored `consent_version`/`consent_at`), provide a data‑deletion path, document a retention policy. `CONFIRM` retention period.

---

## 6. Auth flows (exact behavior)

### A. New donor registration (seamless, no login)
1. Donor lands on **`/register`** (directly, or via the **Register** button on the existing landing page) → short form: **email, mobile, full name** (required); **company, blood group, DoB** (optional); **consent checkbox** (required). No URL parameters.
2. On submit, a **server action** runs (Drizzle): Zod validate → check `donors.email`.
   - **If email exists** → return a "you're already registered" result; render the **login CTA** (do **not** reveal any stored data). Stop.
   - **If new** →
     a. Insert `donors` (`email_verified=false`, `auth_user_id=null`, consent fields).
     b. If there is a **current active event** (`app_settings.current_event_id`, status `active`, `now < end_at`): create `event_attendees` row (`status='registered'`), generate `badge_token`. **Else**: still create the donor record (so they're captured for future drives), and render a warm **"no active drive" thank‑you screen** — a small celebratory/grateful gesture (droplet/heart animation), a "thanks for your interest, we'll reach out when the next drive is scheduled" message, and a **Close** button. No badge, no event row.
     c. Enqueue `confirmation` notification job (email; push only if subscribed).
3. Render the **confirmation screen immediately** (same response): greeting, venue + timing, do's/don'ts, and the **badge QR**. This is safe because it only echoes what they just entered.
4. Async: SES sends a confirmation email containing the badge QR, venue/timing, prep instructions, an **.ics** calendar invite, and a **magic login link** (so the real inbox owner is the one who can return — this also doubles as ownership verification and mitigates someone registering another person's email).

### B. Returning donor / already‑exists → login
- `/login` (or the CTA) → enter email → Supabase `signInWithOtp` (sends **6‑digit OTP + magic link** via SES‑backed SMTP).
- Verify OTP **or** click magic link → Supabase session created.
- **Link step (server callback):** match the session's email to the `donors` row, set `auth_user_id` + `email_verified=true` if not yet linked. From now on, server‑side `requireDonor()` resolves this donor from the session and scopes all their queries.
- Authenticated donor can: view current‑event status, see full event history, update editable profile fields (name, mobile, company, blood group, DoB — **not** email), download certificate for donated events, manage notifications.

### C. Admin login
- `/admin/login` → email → Supabase OTP, **restricted to allowlisted/`admins` emails** (reject others before sending, or after verify — verify on the server). On success, `requireAdmin()` middleware checks `admins.active`. Roles: `super` (all), `scanner` (scan + mark only) — `CONFIRM` exact role split.

---

## 7. Donor‑facing features & routes

- **`/register`** — registration form, reached directly or from the **Register** button on the existing landing page (no URL params). States: new, already‑exists→login, no‑active‑event→thank‑you+Close. Fields: email, mobile, full name (required); company, blood group, DoB (optional); consent checkbox. Mobile‑first, single screen, inline validation, friendly micro‑animation on submit.
- **Confirmation screen** — greeting + venue/timing + do's/don'ts + **badge QR** (savable/printable) + "add to calendar" + offer to enable push.
- **`/status`** (auth) — current event status with a clear visual stage: `registered → confirmed → checked_in → donated` (or `deferred`/`no_show`), plus venue/timing and badge. Reads a REST endpoint and **polls on an interval** (e.g. every 15–30s via TanStack Query `refetchInterval`) so the stage advances shortly after the admin checks them in / marks donated — no websocket.
- **Donation celebration** — when status flips to `donated`, show an **animated crowned achievement**: confetti/crown, total lifetime donations count (animated counter), milestone badges (1st, 5th, 10th — `CONFIRM` thresholds), and a "download certificate" button.
- **`/history`** (auth) — list of all events the donor has attended: date, venue, status, donated y/n, certificate link where applicable.
- **`/certificate/[attendeeId]`** (auth, owner only) — server verifies ownership + that the row is `donated`, returns the certificate **data** (name, company, blood group, event details, both org names/logos/signatories, `certificate_number`); the PDF is then **rendered on the fly in the browser** (`@react-pdf/renderer`) and downloaded. **Never stored.** "Email me this certificate" button → server renders the same PDF **in‑memory** and SES attaches it (email only on explicit request; still not persisted).
- **`/feedback/[attendeeId]`** (auth or signed link) — post‑donation feedback form (rating + comment + would‑donate‑again). One submission per attendee.

---

## 8. Admin panel features & routes

- **`/admin/login`** — email OTP, allowlisted.
- **Event switcher** (global header) — select among events; selection sets the **viewing/working context** only (dashboard, attendees, scan all scope to it) and does **not** change which event is publicly active for new QR registrations. A separate explicit **"Set as active drive"** action writes `app_settings.current_event_id` — that, and only that, controls what new scans enrol into.
- **`/admin` Dashboard** — beautiful animated KPIs + charts for the selected event, kept **near‑live by interval polling** (a single aggregated stats REST endpoint, refetched every ~10–15s; animate counter transitions between refreshes):
  - KPIs: registered, confirmed, checked‑in, donated, deferred, no‑show, conversion % (registered→donated). Animated counters.
  - Charts: registrations over time, donations over time, blood‑group distribution, check‑in vs donation funnel.
  - Year/event comparison view (aggregate across events).
  - Counts refresh on the polling interval — **no websocket / Supabase Realtime**. Provide a manual "refresh" affordance too.
- **`/admin/events`** — list + **create event** (name, venue, address, start/end, donation window, instructions, both orgs' names + signatories; logos are fixed static assets, not entered here). Edit, close, set‑active. Optionally **bulk‑assign existing donors** as attendees to an event.
- **`/admin/scan`** — camera **QR scanner** (the venue check‑in flow: attendee shows their badge QR on their phone, admin scans it):
  - Resolve `badge_token` server‑side → open the **edit/add screen** with the donor's detail.
  - **Reject** if the token's event ≠ selected event, or event expired/closed.
  - Quick‑edit panel: confirm/edit **name, mobile, company**, **capture/edit blood group** (required before they can be marked donated), then **Check in** → sets `status='checked_in'` (i.e. attended/present). From the same screen the admin can proceed to **Mark donated**, **Defer**, or **No‑show** as appropriate.
  - **Add walk‑in attendee** to the selected event for someone with no badge (search existing donor or create one; one donor → one row per event; their history persists across events).
- **`/admin/attendees`** — table of attendees for the selected event: search/filter by status/blood group; row actions: check‑in, **Mark donated** (button) → sets `donated`, `donated_at`, `marked_by`, generates `certificate_number`, enqueues `thank_you` + `feedback_request` notifications; mark deferred/no‑show.
- **`/admin/users`** — global donor directory: profile + **full multi‑event history** (past years, current, donated/not per event). Edit donor (audited).
- **`/admin/reports`** — per‑event report export to **Excel** and **PDF** (see §12).

---

## 9. Email, notifications & PWA

- **Auth emails** (OTP, magic link): Supabase Auth, SMTP → AWS SES, custom branded templates.
- **Transactional (SES SDK):**
  - `confirmation` — badge QR (inline/attached), venue/timing, prep do's/don'ts, .ics, magic login link.
  - `reminder_day_before` — "get ready" guidance: eat a proper meal, hydrate well, sleep enough, **avoid alcohol & smoking** before donating, carry ID; venue/timing + badge.
  - `thank_you` — sent on `donated`, greeting + certificate link.
  - `feedback_request` — link to feedback form.
  - `certificate` — only on explicit user request.
- **Web Push (PWA):** VAPID keys; service worker handles `push`/`notificationclick`. Donors opt in (prompt after confirmation and from settings). Same event types deliverable as push where subscribed. Store subscriptions in `push_subscriptions`.
- **PWA:** `manifest.json` (name, icons, theme color in the blood‑donation palette, standalone display), installable, offline shell for static pages, service worker for push. iOS push caveats noted (requires installed PWA).

---

## 10. Reminder pipeline (cron)

- **Vercel Cron** hits `/api/cron/reminders` (protected by `CRON_SECRET`), e.g. hourly.
- Logic: for the active/upcoming event, find attendees whose event starts within the reminder window (~24h) and who have no `reminder_day_before` job `sent` → enqueue/send via SES + push, write `notification_jobs` with a `dedupe_key` so it can't double‑send.
- Same worker drains any `pending` jobs (confirmation, thank‑you, feedback) for retry resilience.
- All sends idempotent via `dedupe_key`.

---

## 11. Certificate generation

- Rendered with `@react-pdf/renderer` **on demand, never stored**: client‑side for the donor's/admin's direct download, and in‑memory server‑side only when emailing. Allowed **only** when the attendee row is `donated`.
- Logos are **static files in `/public/images/`** — `confluxsys.png` (organiser) and `janakalyan.png` (blood bank) — referenced directly by the renderer; nothing logo‑related is stored in the DB.
- Contents: **organiser logo + blood‑bank logo**, both **org names**, attendee **full name**, **company** (from the donor's registration, editable by admin at the event), **blood group** (from `blood_group_at_event`), **event name + date + venue**, a unique **certificate number** (persisted on the attendee row at donation time so re‑generation is stable), and **both signatories** (organiser + blood bank, name + title). Optional small verification QR.
- Access control (server‑checked): owner donor (`requireDonor()`, must own the attendee row) or admin. Email send only on explicit request.

---

## 12. Reports

- **Per‑event** export, both formats:
  - **Excel (`exceljs`):** attendee sheet (name, mobile masked per policy, company, blood group, status, check‑in time, donated y/n) + a summary sheet (KPIs, blood‑group distribution, conversion). Apply formatting/headers.
  - **PDF (`@react-pdf/renderer`):** branded one‑pager with the event KPIs, funnel, and blood‑group distribution.
- Admin‑only, audited, **generated in‑memory on request and streamed as a download — not stored**. `CONFIRM`: how much PII (e.g., full mobile/email) is allowed in exports.

---

## 13. UI / UX direction

- **Modern minimalist**, generous whitespace, strong type hierarchy, mobile‑first. Subtle blood‑donation theme: a restrained red/crimson accent on neutral base, a heartbeat/droplet motif used sparingly.
- **Animation (Framer Motion):** form submit success, status‑stage transitions, the crowned donation celebration (confetti + animated counters), dashboard KPI count‑ups, chart entrance. Respect `prefers-reduced-motion`.
- **Components:** shadcn/ui + Base UI primitives, Tailwind tokens, Lucide, Recharts. Consistent loading/skeleton + empty + error states everywhere.
- **`CONFIRM` — multi‑language** (English/Hindi/Marathi) for donor screens. Default: English only, structured for easy i18n later.

---

## 14. Non‑functional requirements

- TypeScript strict; Zod at every boundary; no `any` in domain code.
- Centralized error handling; user‑safe messages; structured server logs.
- Accessibility: labels, focus management, keyboard support, contrast, reduced‑motion.
- Idempotent emails/push (dedupe keys). Retries with backoff on SES failures.
- Tests: unit for registration/auth‑link/badge‑resolve/cron logic; a couple of e2e happy paths (register → confirm → check‑in → donate → certificate).
- Seed script: one org's `app_settings`, a sample event, a few donors/attendees, admin allowlist bootstrap.

---

## 15. Open items to confirm (each has a safe default already coded)
**Resolved (locked in this revision):** registration is at **`/register`** (direct or via the existing landing page's Register button) — **no `locationId` / URL params, no location attribution at all** • org/blood‑bank **logos are static files in `/public/images/` (`confluxsys.png`, `janakalyan.png`)**, not in the DB • **web push kept** • company captured on the registration form and editable by admin at the event • no‑active‑event → capture donor + warm thank‑you screen with Close, no badge • event switcher = viewing context only, with a separate "Set as active drive" action • admins can access all donor data (the isolation rule is donor‑scope only) • scan → opens edit/add screen → `checked_in` (attended), with donate/defer/no‑show available from there • **Data API disabled, no RLS — all DB access is server‑side Drizzle; isolation enforced in server code** • **certificates generated on the fly (client download / in‑memory email), never stored; no object storage** • **dashboard + status are REST + interval polling, no websockets/Realtime**.

**Still open (safe defaults coded):**
1. **Admin roles** — default: `super` + `scanner`. Confirm the exact permission split.
2. **Milestone thresholds** for celebration/badges — default: 1/5/10/25. Confirm.
3. **DPDP data retention** period + deletion request flow. Confirm.
4. **PII in exports** — how much (mask mobile/email?). Confirm.
5. **Multi‑language** — default English only. Confirm if Hindi/Marathi needed at launch.

---

## 16. Suggested build order
1. **Existing repo:** a basic Next.js project and the landing page are already in place — extend them, don't re‑scaffold. Wire env, Drizzle schema + migrations + seed, Supabase Auth + SES SMTP, **Data API disabled**; add the **Register** entry point to `/register`; drop the two logo files into `/public/images/` (`confluxsys.png`, `janakalyan.png`).
2. Server auth layer: `requireDonor()` / `requireAdmin()` guards + audit log (the enforcement boundary — no RLS).
3. Donor registration flow (new / already‑exists / no‑active‑event) + confirmation screen + badge token.
4. Confirmation email (SES) + magic link + auth‑link callback.
5. Donor status (polling) / history / certificate (on‑the‑fly) / feedback — all server‑scoped to the caller.
6. Admin: login, event create/switch/set‑active, attendees table, mark‑donated, scanner + blood‑group capture + check‑in.
7. Dashboard + charts (aggregated stats REST endpoint + interval polling).
8. Reminder cron + push/PWA.
9. Reports (xlsx/pdf, in‑memory).
10. Polish: animations, a11y, reduced‑motion, empty/error states, tests.

**Definition of done:** a donor can register from a QR with no login, get a badge by email, be checked in and marked donated by an admin who captured their blood group at the venue, see a celebration, download an on‑the‑fly certificate, and give feedback — while never being able to read anyone else's data (enforced in server code); and an admin can run the whole event from a polling dashboard and export per‑event reports.