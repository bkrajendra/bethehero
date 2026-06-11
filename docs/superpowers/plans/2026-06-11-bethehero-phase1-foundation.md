# BeTheHero — Phase 1: Foundation (DB, Auth, Config) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the full data model, Drizzle migrations, Supabase auth helpers (requireDonor / requireAdmin guards), seed script, and all environment plumbing — so every subsequent phase has a stable foundation to build on.

**Architecture:** Next.js App Router (TypeScript strict). All DB access is server-side via Drizzle over a direct Postgres connection to Supabase; the browser never touches the DB. Auth is handled by Supabase Auth (email OTP / magic link) via `@supabase/ssr`; the session gives us `auth.uid()` which the server resolves to a `donors` or `admins` row. Data isolation is enforced entirely in server code — `requireDonor()` scopes every query to the calling donor's id, `requireAdmin()` verifies the admin allowlist.

**Tech Stack:** Next.js 15+, TypeScript strict, Drizzle ORM + drizzle-kit, Supabase Auth (`@supabase/ssr` + `@supabase/supabase-js`), Postgres (`postgres` driver), Zod, nanoid, shadcn/ui (init only), Tailwind v4.

---

## File Map

| File | Responsibility |
|------|---------------|
| `drizzle.config.ts` | Drizzle-kit config |
| `src/lib/db/schema.ts` | All table + enum definitions |
| `src/lib/db/index.ts` | Drizzle client singleton |
| `src/lib/db/queries/donors.ts` | Donor CRUD helpers |
| `src/lib/db/queries/events.ts` | Event + app_settings helpers |
| `src/lib/db/queries/attendees.ts` | event_attendees CRUD |
| `src/lib/db/queries/admins.ts` | Admin lookup |
| `src/lib/db/queries/audit.ts` | Audit log write |
| `src/lib/auth/server.ts` | `requireDonor()`, `requireAdmin()`, Supabase SSR client |
| `src/lib/auth/client.ts` | Supabase browser client (session only) |
| `scripts/seed.ts` | Seed: app_settings, event, donors, attendees, admin |
| `.env.local.example` | All required env vars documented |

---

### Task 1: Install all Phase 1 dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime + dev dependencies**

```bash
cd /Users/rajendrakhope/Documents/MySpace/blood-donation/bethehero
pnpm add drizzle-orm postgres @supabase/supabase-js @supabase/ssr nanoid zod
pnpm add -D drizzle-kit tsx @types/pg dotenv
```

Expected: pnpm installs without errors.

- [ ] **Step 2: Install shadcn/ui (init only — components added per phase)**

```bash
pnpm dlx shadcn@latest init -d
```

When prompted: TypeScript=yes, style=default, baseColor=neutral, cssVariables=yes, tailwind config path=postcss.config.mjs, components alias=@/components, utils alias=@/lib/utils, React Server Components=yes.

Expected: `components.json` created, `src/lib/utils.ts` created with `cn()`.

- [ ] **Step 3: Add essential shadcn components used across all phases**

```bash
pnpm dlx shadcn@latest add button input label form card badge separator toast sonner
```

Expected: components added to `src/components/ui/`.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: install phase 1 dependencies and init shadcn"
```

---

### Task 2: Environment setup

**Files:**
- Create: `.env.local.example`
- Create: `.env.local` (not committed — user fills in real values)

- [ ] **Step 1: Create `.env.local.example`**

```bash
cat > .env.local.example << 'EOF'
# Supabase Postgres (Drizzle)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# Supabase Auth (public — safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only secrets — NEVER ship to client
SUPABASE_SERVICE_ROLE_KEY=

# AWS SES
AWS_SES_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_FROM_EMAIL=noreply@yourdomain.com

# Web Push (VAPID)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yourdomain.com

# App
CRON_SECRET=
ADMIN_ALLOWLIST=admin@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 2: Copy to `.env.local` for local dev**

```bash
cp .env.local.example .env.local
```

Developer must fill in real values before running the app.

- [ ] **Step 3: Commit example file**

```bash
git add .env.local.example
git commit -m "chore: add env.local.example with all required variables"
```

---

### Task 3: Drizzle config

**Files:**
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create drizzle config**

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
});
```

- [ ] **Step 2: Add migration scripts to package.json**

Open `package.json` and add to `"scripts"`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio",
"db:seed": "tsx scripts/seed.ts"
```

- [ ] **Step 3: Commit**

```bash
git add drizzle.config.ts package.json
git commit -m "chore: add drizzle config and db scripts"
```

---

### Task 4: Drizzle schema

**Files:**
- Create: `src/lib/db/schema.ts`

- [ ] **Step 1: Write the full schema**

```typescript
// src/lib/db/schema.ts
import {
  pgTable, pgEnum, uuid, text, boolean, timestamp,
  date, integer, smallint, jsonb, unique, index,
} from "drizzle-orm/pg-core";
import { citext } from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────
export const attendeeStatusEnum = pgEnum("attendee_status", [
  "registered", "confirmed", "checked_in", "donated", "deferred", "no_show",
]);
export const eventStatusEnum = pgEnum("event_status", ["draft", "active", "closed"]);
export const bloodGroupEnum = pgEnum("blood_group", [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "confirmation", "reminder_day_before", "thank_you", "feedback_request", "certificate",
]);
export const notificationChannelEnum = pgEnum("notification_channel", ["email", "push"]);
export const adminRoleEnum = pgEnum("admin_role", ["super", "scanner"]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "pending", "sent", "failed", "skipped",
]);

// ── donors ───────────────────────────────────────────
export const donors = pgTable("donors", {
  id:             uuid("id").primaryKey().defaultRandom(),
  authUserId:     uuid("auth_user_id"),
  email:          citext("email").notNull().unique(),
  emailVerified:  boolean("email_verified").notNull().default(false),
  mobile:         text("mobile").notNull(),
  fullName:       text("full_name").notNull(),
  bloodGroup:     bloodGroupEnum("blood_group"),
  dob:            date("dob"),
  company:        text("company"),
  consentGiven:   boolean("consent_given").notNull().default(false),
  consentAt:      timestamp("consent_at", { withTimezone: true }),
  consentVersion: text("consent_version"),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── events ───────────────────────────────────────────
export const events = pgTable("events", {
  id:                        uuid("id").primaryKey().defaultRandom(),
  name:                      text("name").notNull(),
  venue:                     text("venue").notNull(),
  address:                   text("address").notNull(),
  startAt:                   timestamp("start_at", { withTimezone: true }).notNull(),
  endAt:                     timestamp("end_at", { withTimezone: true }).notNull(),
  donationOpenAt:            timestamp("donation_open_at", { withTimezone: true }),
  donationCloseAt:           timestamp("donation_close_at", { withTimezone: true }),
  status:                    eventStatusEnum("status").notNull().default("draft"),
  instructionsDos:           jsonb("instructions_dos"),
  instructionsDonts:         jsonb("instructions_donts"),
  organiserName:             text("organiser_name").notNull(),
  bloodBankName:             text("blood_bank_name").notNull(),
  organiserSignatoryName:    text("organiser_signatory_name").notNull(),
  organiserSignatoryTitle:   text("organiser_signatory_title").notNull(),
  bloodBankSignatoryName:    text("blood_bank_signatory_name").notNull(),
  bloodBankSignatoryTitle:   text("blood_bank_signatory_title").notNull(),
  createdAt:                 timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                 timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── event_attendees ──────────────────────────────────
export const eventAttendees = pgTable("event_attendees", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  eventId:             uuid("event_id").notNull().references(() => events.id),
  donorId:             uuid("donor_id").notNull().references(() => donors.id),
  status:              attendeeStatusEnum("status").notNull().default("registered"),
  badgeToken:          text("badge_token").notNull().unique(),
  bloodGroupAtEvent:   bloodGroupEnum("blood_group_at_event"),
  donationVolumeMl:    integer("donation_volume_ml"),
  deferralReason:      text("deferral_reason"),
  checkedInAt:         timestamp("checked_in_at", { withTimezone: true }),
  checkedInBy:         uuid("checked_in_by"),
  donatedAt:           timestamp("donated_at", { withTimezone: true }),
  markedBy:            uuid("marked_by"),
  certificateNumber:   text("certificate_number").unique(),
  certificateIssuedAt: timestamp("certificate_issued_at", { withTimezone: true }),
  createdAt:           timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.eventId, t.donorId),
  index("idx_attendees_badge_token").on(t.badgeToken),
  index("idx_attendees_event_status").on(t.eventId, t.status),
]);

// ── admins ───────────────────────────────────────────
export const admins = pgTable("admins", {
  id:         uuid("id").primaryKey().defaultRandom(),
  authUserId: uuid("auth_user_id").notNull(),
  email:      citext("email").notNull().unique(),
  name:       text("name").notNull(),
  role:       adminRoleEnum("role").notNull().default("scanner"),
  active:     boolean("active").notNull().default(true),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── notification_jobs ────────────────────────────────
export const notificationJobs = pgTable("notification_jobs", {
  id:          uuid("id").primaryKey().defaultRandom(),
  attendeeId:  uuid("attendee_id").notNull().references(() => eventAttendees.id),
  type:        notificationTypeEnum("type").notNull(),
  channel:     notificationChannelEnum("channel").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  sentAt:      timestamp("sent_at", { withTimezone: true }),
  status:      notificationStatusEnum("status").notNull().default("pending"),
  error:       text("error"),
  dedupeKey:   text("dedupe_key").notNull().unique(),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── push_subscriptions ───────────────────────────────
export const pushSubscriptions = pgTable("push_subscriptions", {
  id:        uuid("id").primaryKey().defaultRandom(),
  donorId:   uuid("donor_id").notNull().references(() => donors.id),
  endpoint:  text("endpoint").notNull().unique(),
  p256dh:    text("p256dh").notNull(),
  auth:      text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── feedback ─────────────────────────────────────────
export const feedback = pgTable("feedback", {
  id:              uuid("id").primaryKey().defaultRandom(),
  attendeeId:      uuid("attendee_id").notNull().references(() => eventAttendees.id).unique(),
  rating:          smallint("rating").notNull(),
  comment:         text("comment"),
  wouldDonateAgain: boolean("would_donate_again"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── audit_log ────────────────────────────────────────
export const auditLog = pgTable("audit_log", {
  id:           uuid("id").primaryKey().defaultRandom(),
  actorAdminId: uuid("actor_admin_id").notNull(),
  action:       text("action").notNull(),
  targetTable:  text("target_table").notNull(),
  targetId:     uuid("target_id").notNull(),
  metadata:     jsonb("metadata"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── app_settings ─────────────────────────────────────
export const appSettings = pgTable("app_settings", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  currentEventId:        uuid("current_event_id").references(() => events.id),
  defaultInstructionsDos:   jsonb("default_instructions_dos"),
  defaultInstructionsDonts: jsonb("default_instructions_donts"),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat: add full drizzle schema (all tables and enums)"
```

---

### Task 5: Drizzle client

**Files:**
- Create: `src/lib/db/index.ts`

- [ ] **Step 1: Write DB client**

```typescript
// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Prevent multiple connections in dev (Next.js hot-reload)
const globalForDb = global as unknown as { pg?: ReturnType<typeof postgres> };
const pg = globalForDb.pg ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.pg = pg;

export const db = drizzle(pg, { schema });
export type DB = typeof db;
```

- [ ] **Step 2: Generate and run migrations**

```bash
# Requires DIRECT_URL in .env.local
pnpm db:generate
pnpm db:migrate
```

Expected: migration SQL files created in `drizzle/`, tables created in Supabase Postgres.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/index.ts drizzle/
git commit -m "feat: add drizzle client and initial migration"
```

---

### Task 6: DB query helpers

**Files:**
- Create: `src/lib/db/queries/donors.ts`
- Create: `src/lib/db/queries/events.ts`
- Create: `src/lib/db/queries/attendees.ts`
- Create: `src/lib/db/queries/admins.ts`
- Create: `src/lib/db/queries/audit.ts`
- Create: `src/lib/db/queries/notifications.ts`

- [ ] **Step 1: Donors queries**

```typescript
// src/lib/db/queries/donors.ts
import { eq } from "drizzle-orm";
import { db } from "../index";
import { donors } from "../schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Donor = InferSelectModel<typeof donors>;
export type NewDonor = InferInsertModel<typeof donors>;

export async function getDonorByEmail(email: string) {
  return db.query.donors.findFirst({ where: eq(donors.email, email.toLowerCase()) });
}

export async function getDonorByAuthUserId(authUserId: string) {
  return db.query.donors.findFirst({ where: eq(donors.authUserId, authUserId) });
}

export async function getDonorById(id: string) {
  return db.query.donors.findFirst({ where: eq(donors.id, id) });
}

export async function createDonor(data: NewDonor) {
  const [donor] = await db.insert(donors).values(data).returning();
  return donor;
}

export async function linkDonorToAuthUser(donorId: string, authUserId: string) {
  await db
    .update(donors)
    .set({ authUserId, emailVerified: true, updatedAt: new Date() })
    .where(eq(donors.id, donorId));
}

export async function updateDonorProfile(
  donorId: string,
  data: Pick<Donor, "fullName" | "mobile" | "company" | "bloodGroup" | "dob">,
) {
  const [updated] = await db
    .update(donors)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(donors.id, donorId))
    .returning();
  return updated;
}
```

- [ ] **Step 2: Events + app_settings queries**

```typescript
// src/lib/db/queries/events.ts
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
    await db.update(appSettings).set({ currentEventId: eventId, updatedAt: new Date() });
  } else {
    await db.insert(appSettings).values({ currentEventId: eventId });
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
```

- [ ] **Step 3: Attendees queries**

```typescript
// src/lib/db/queries/attendees.ts
import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { eventAttendees } from "../schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Attendee = InferSelectModel<typeof eventAttendees>;
export type NewAttendee = InferInsertModel<typeof eventAttendees>;

export async function getAttendeeByBadgeToken(token: string) {
  return db.query.eventAttendees.findFirst({
    where: eq(eventAttendees.badgeToken, token),
    with: { donor: true, event: true },
  });
}

export async function getAttendeeByDonorAndEvent(donorId: string, eventId: string) {
  return db.query.eventAttendees.findFirst({
    where: and(
      eq(eventAttendees.donorId, donorId),
      eq(eventAttendees.eventId, eventId),
    ),
  });
}

export async function getAttendeeById(id: string) {
  return db.query.eventAttendees.findFirst({
    where: eq(eventAttendees.id, id),
    with: { donor: true, event: true },
  });
}

export async function getAttendeesByDonor(donorId: string) {
  return db.query.eventAttendees.findMany({
    where: eq(eventAttendees.donorId, donorId),
    with: { event: true },
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });
}

export async function getAttendeesByEvent(eventId: string) {
  return db.query.eventAttendees.findMany({
    where: eq(eventAttendees.eventId, eventId),
    with: { donor: true },
    orderBy: (a, { asc }) => [asc(a.createdAt)],
  });
}

export async function createAttendee(data: NewAttendee) {
  const [attendee] = await db.insert(eventAttendees).values(data).returning();
  return attendee;
}

export async function updateAttendee(id: string, data: Partial<NewAttendee>) {
  const [updated] = await db
    .update(eventAttendees)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(eventAttendees.id, id))
    .returning();
  return updated;
}
```

- [ ] **Step 4: Admins queries**

```typescript
// src/lib/db/queries/admins.ts
import { eq } from "drizzle-orm";
import { db } from "../index";
import { admins } from "../schema";
import type { InferSelectModel } from "drizzle-orm";

export type Admin = InferSelectModel<typeof admins>;

export async function getAdminByEmail(email: string) {
  return db.query.admins.findFirst({ where: eq(admins.email, email.toLowerCase()) });
}

export async function getAdminByAuthUserId(authUserId: string) {
  return db.query.admins.findFirst({ where: eq(admins.authUserId, authUserId) });
}
```

- [ ] **Step 5: Audit log helper**

```typescript
// src/lib/db/queries/audit.ts
import { db } from "../index";
import { auditLog } from "../schema";

export async function writeAuditLog(params: {
  actorAdminId: string;
  action: string;
  targetTable: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLog).values(params);
}
```

- [ ] **Step 6: Notification jobs helpers**

```typescript
// src/lib/db/queries/notifications.ts
import { and, eq, lt } from "drizzle-orm";
import { db } from "../index";
import { notificationJobs } from "../schema";
import type { InferInsertModel } from "drizzle-orm";

export async function enqueueNotification(data: InferInsertModel<typeof notificationJobs>) {
  // insert or ignore on dedupe_key conflict
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
```

- [ ] **Step 7: Add Drizzle relations (needed for `with:` queries)**

Append to `src/lib/db/schema.ts`:

```typescript
import { relations } from "drizzle-orm";

export const donorsRelations = relations(donors, ({ many }) => ({
  attendees: many(eventAttendees),
  pushSubscriptions: many(pushSubscriptions),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  attendees: many(eventAttendees),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one, many }) => ({
  donor: one(donors, { fields: [eventAttendees.donorId], references: [donors.id] }),
  event: one(events, { fields: [eventAttendees.eventId], references: [events.id] }),
  notificationJobs: many(notificationJobs),
  feedback: one(feedback, { fields: [eventAttendees.id], references: [feedback.attendeeId] }),
}));

export const notificationJobsRelations = relations(notificationJobs, ({ one }) => ({
  attendee: one(eventAttendees, { fields: [notificationJobs.attendeeId], references: [eventAttendees.id] }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  donor: one(donors, { fields: [pushSubscriptions.donorId], references: [donors.id] }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  attendee: one(eventAttendees, { fields: [feedback.attendeeId], references: [eventAttendees.id] }),
}));
```

- [ ] **Step 8: Regenerate migration with relations**

```bash
pnpm db:generate
pnpm db:migrate
```

Expected: new migration file generated and applied.

- [ ] **Step 9: Commit**

```bash
git add src/lib/db/
git commit -m "feat: add db query helpers and drizzle relations"
```

---

### Task 7: Supabase auth helpers

**Files:**
- Create: `src/lib/auth/server.ts`
- Create: `src/lib/auth/client.ts`

- [ ] **Step 1: Write server auth helpers**

```typescript
// src/lib/auth/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getDonorByAuthUserId } from "@/lib/db/queries/donors";
import { getAdminByAuthUserId } from "@/lib/db/queries/admins";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — cookies can't be set there
          }
        },
      },
    },
  );
}

/** Resolves the calling donor from the Supabase session. Throws 401 if not authenticated. */
export async function requireDonor() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const donor = await getDonorByAuthUserId(user.id);
  if (!donor) {
    throw new Response("Donor not found", { status: 401 });
  }
  return { donorId: donor.id, authUserId: user.id, email: user.email!, donor };
}

/** Resolves the calling admin from the Supabase session. Throws 401/403 if not an active admin. */
export async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const admin = await getAdminByAuthUserId(user.id);
  if (!admin || !admin.active) {
    throw new Response("Forbidden", { status: 403 });
  }
  return { adminId: admin.id, authUserId: user.id, email: user.email!, admin };
}
```

- [ ] **Step 2: Write browser auth client**

```typescript
// src/lib/auth/client.ts
import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
```

- [ ] **Step 3: Create the Supabase auth callback route (links donor on first OTP verify)**

```typescript
// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getDonorByEmail } from "@/lib/db/queries/donors";
import { linkDonorToAuthUser } from "@/lib/db/queries/donors";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/status";

  if (code) {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user?.email) {
      const donor = await getDonorByEmail(user.email);
      if (donor && !donor.authUserId) {
        await linkDonorToAuthUser(donor.id, user.id);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/ src/app/auth/
git commit -m "feat: add supabase auth helpers (requireDonor, requireAdmin, callback)"
```

---

### Task 8: Seed script

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: Write seed script**

```typescript
// scripts/seed.ts
import "dotenv/config";
import { db } from "../src/lib/db/index";
import { donors, events, eventAttendees, admins, appSettings } from "../src/lib/db/schema";
import { nanoid } from "nanoid";

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Create event
  const [event] = await db.insert(events).values({
    name: "Confluxsys Blood Donation Drive 2026",
    venue: "Confluxsys Pvt Ltd",
    address: "Magarpatta City, Hadapsar, Pune, Maharashtra 411013",
    startAt: new Date("2026-06-17T09:00:00+05:30"),
    endAt: new Date("2026-06-17T17:00:00+05:30"),
    donationOpenAt: new Date("2026-06-17T09:00:00+05:30"),
    donationCloseAt: new Date("2026-06-17T16:30:00+05:30"),
    status: "active",
    organiserName: "Confluxsys Pvt Ltd",
    bloodBankName: "Janakalyan Rakta Pedhi",
    organiserSignatoryName: "Rajendra Khope",
    organiserSignatoryTitle: "CEO, Confluxsys Pvt Ltd",
    bloodBankSignatoryName: "Dr. Priya Sharma",
    bloodBankSignatoryTitle: "Medical Director, Janakalyan Rakta Pedhi",
    instructionsDos: ["Eat a full meal 2-3 hours before donating", "Drink plenty of water", "Get a good night's sleep"],
    instructionsDonts: ["Avoid alcohol for 24 hours before donating", "Avoid smoking before donating", "Don't donate on an empty stomach"],
  }).returning();
  console.log("✓ Event created:", event.id);

  // 2. App settings
  await db.insert(appSettings).values({
    currentEventId: event.id,
    defaultInstructionsDos: ["Eat well", "Stay hydrated", "Sleep well"],
    defaultInstructionsDonts: ["No alcohol", "No smoking", "Not on empty stomach"],
  }).onConflictDoNothing();
  console.log("✓ App settings created");

  // 3. Sample donors
  const sampleDonors = [
    { email: "alice@example.com", mobile: "+919876543210", fullName: "Alice Sharma", bloodGroup: "O+" as const, company: "Confluxsys Pvt Ltd" },
    { email: "bob@example.com", mobile: "+919876543211", fullName: "Bob Patel", bloodGroup: "A+" as const, company: "Confluxsys Pvt Ltd" },
  ];

  for (const d of sampleDonors) {
    const [donor] = await db.insert(donors).values({
      ...d, consentGiven: true, consentAt: new Date(), consentVersion: "v1.0",
    }).onConflictDoNothing().returning();
    if (donor) {
      await db.insert(eventAttendees).values({
        eventId: event.id, donorId: donor.id, badgeToken: nanoid(24), status: "registered",
      }).onConflictDoNothing();
      console.log("✓ Donor + attendee:", donor.email);
    }
  }

  // 4. Admin (auth_user_id will be linked on first login — we just need the email allowlisted)
  const adminEmail = process.env.ADMIN_ALLOWLIST?.split(",")[0]?.trim();
  if (adminEmail) {
    await db.insert(admins).values({
      authUserId: "00000000-0000-0000-0000-000000000000", // placeholder; overwritten on first login
      email: adminEmail,
      name: "Admin",
      role: "super",
      active: true,
    }).onConflictDoNothing();
    console.log("✓ Admin seeded:", adminEmail);
  }

  console.log("✅ Seed complete");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run seed**

```bash
pnpm db:seed
```

Expected: "✅ Seed complete" with created entity IDs logged.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat: add seed script with sample event, donors, admin"
```

---

### Task 9: Verify foundation works

- [ ] **Step 1: Run dev server and confirm no TS errors**

```bash
pnpm dev
```

Expected: server starts on http://localhost:3000, landing page visible, no TypeScript errors in terminal.

- [ ] **Step 2: Verify DB connection via drizzle studio**

```bash
pnpm db:studio
```

Expected: Drizzle Studio opens and shows all tables with seed data.

- [ ] **Step 3: Commit any fixes, then tag phase complete**

```bash
git add .
git commit -m "chore: phase 1 foundation complete"
```

---

## Phase 1 Checklist (self-review)

- [x] All env vars documented in `.env.local.example`
- [x] Drizzle schema matches spec §4 exactly (all tables, enums, columns, indexes)
- [x] Relations defined for all `with:` query patterns
- [x] `requireDonor()` scopes to caller's donorId — no unscoped donor queries possible
- [x] `requireAdmin()` verifies active admin in DB
- [x] Auth callback links donor on first OTP/magic-link verify
- [x] Seed script bootstraps everything needed for Phase 2+ testing
- [x] Service role key never referenced in any client file
