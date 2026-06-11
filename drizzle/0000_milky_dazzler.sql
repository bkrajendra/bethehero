CREATE TYPE "public"."admin_role" AS ENUM('super', 'scanner');--> statement-breakpoint
CREATE TYPE "public"."attendee_status" AS ENUM('registered', 'confirmed', 'checked_in', 'donated', 'deferred', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."blood_group" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'push');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('confirmation', 'reminder_day_before', 'thank_you', 'feedback_request', 'certificate');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "admin_role" DEFAULT 'scanner' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text DEFAULT 'singleton' NOT NULL,
	"current_event_id" uuid,
	"default_instructions_dos" jsonb,
	"default_instructions_donts" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_table" text NOT NULL,
	"target_id" uuid NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"mobile" text NOT NULL,
	"full_name" text NOT NULL,
	"blood_group" "blood_group",
	"dob" date,
	"company" text,
	"consent_given" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone,
	"consent_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "event_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"donor_id" uuid NOT NULL,
	"status" "attendee_status" DEFAULT 'registered' NOT NULL,
	"badge_token" text NOT NULL,
	"blood_group_at_event" "blood_group",
	"donation_volume_ml" integer,
	"deferral_reason" text,
	"checked_in_at" timestamp with time zone,
	"checked_in_by" uuid,
	"donated_at" timestamp with time zone,
	"marked_by" uuid,
	"certificate_number" text,
	"certificate_issued_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_attendees_badge_token_unique" UNIQUE("badge_token"),
	CONSTRAINT "event_attendees_certificate_number_unique" UNIQUE("certificate_number"),
	CONSTRAINT "event_attendees_event_id_donor_id_unique" UNIQUE("event_id","donor_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"venue" text NOT NULL,
	"address" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"donation_open_at" timestamp with time zone,
	"donation_close_at" timestamp with time zone,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"instructions_dos" jsonb,
	"instructions_donts" jsonb,
	"organiser_name" text NOT NULL,
	"blood_bank_name" text NOT NULL,
	"organiser_signatory_name" text NOT NULL,
	"organiser_signatory_title" text NOT NULL,
	"blood_bank_signatory_name" text NOT NULL,
	"blood_bank_signatory_title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendee_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"would_donate_again" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_attendee_id_unique" UNIQUE("attendee_id")
);
--> statement-breakpoint
CREATE TABLE "notification_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendee_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_jobs_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_current_event_id_events_id_fk" FOREIGN KEY ("current_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_checked_in_by_admins_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_marked_by_admins_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_attendee_id_event_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."event_attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_attendee_id_event_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."event_attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attendees_badge_token" ON "event_attendees" USING btree ("badge_token");--> statement-breakpoint
CREATE INDEX "idx_attendees_event_status" ON "event_attendees" USING btree ("event_id","status");