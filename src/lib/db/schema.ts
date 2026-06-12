import {
  pgTable, pgEnum, uuid, text, boolean, timestamp,
  date, integer, smallint, jsonb, unique, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
  email:          text("email").notNull().unique(),
  emailVerified:  boolean("email_verified").notNull().default(false),
  mobile:         text("mobile").notNull(),
  fullName:       text("full_name").notNull(),
  bloodGroup:     bloodGroupEnum("blood_group"),
  dob:            date("dob"),
  company:        text("company"),
  consentGiven:   boolean("consent_given").notNull().default(false),
  consentAt:      timestamp("consent_at", { withTimezone: true }),
  consentVersion: text("consent_version"),
  deletedAt:      timestamp("deleted_at", { withTimezone: true }),
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
  checkedInBy:         uuid("checked_in_by").references(() => admins.id),
  donatedAt:           timestamp("donated_at", { withTimezone: true }),
  markedBy:            uuid("marked_by").references(() => admins.id),
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
  email:      text("email").notNull().unique(),
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
  id:               uuid("id").primaryKey().defaultRandom(),
  attendeeId:       uuid("attendee_id").notNull().references(() => eventAttendees.id).unique(),
  rating:           smallint("rating").notNull(),
  comment:          text("comment"),
  wouldDonateAgain: boolean("would_donate_again"),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
  id:                       uuid("id").primaryKey().defaultRandom(),
  key:                      text("key").notNull().unique().default("singleton"),
  currentEventId:           uuid("current_event_id").references(() => events.id),
  defaultInstructionsDos:   jsonb("default_instructions_dos"),
  defaultInstructionsDonts: jsonb("default_instructions_donts"),
  createdAt:                timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations ────────────────────────────────────────
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
