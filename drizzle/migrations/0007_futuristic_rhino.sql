DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'appointment_audience_segment'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."appointment_audience_segment" AS ENUM (
      'upcoming', 'today', 'past', 'cancelled', 'all'
    );
  END IF;
END $$;--> statement-breakpoint
--> statement-breakpoint
CREATE TYPE "public"."firm_role" AS ENUM('OWNER', 'ADMIN', 'INSTRUCTOR', 'TAX_PREPARER', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('TAXPAYER', 'AGENCY', 'ADMIN', 'SUPERADMIN', 'LMS_PREPARER', 'LMS_ADMIN', 'TAX_PREPARER');--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'email_campaign_segment'
      AND e.enumlabel = 'email_list'
  ) THEN
    ALTER TYPE "public"."email_campaign_segment" ADD VALUE 'email_list';
  END IF;
END $$;--> statement-breakpoint
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'email_campaign_segment'
      AND e.enumlabel = 'appointments'
  ) THEN
    ALTER TYPE "public"."email_campaign_segment" ADD VALUE 'appointments';
  END IF;
END $$;--> statement-breakpoint
--> statement-breakpoint
CREATE TABLE "direct_deposit_accounts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"use_direct_deposit" boolean DEFAULT false NOT NULL,
	"account_holder_name" text DEFAULT '' NOT NULL,
	"bank_name" text DEFAULT '' NOT NULL,
	"account_type" text DEFAULT 'checking' NOT NULL,
	"routing_encrypted" text DEFAULT '' NOT NULL,
	"account_encrypted" text DEFAULT '' NOT NULL,
	"routing_last4" text DEFAULT '' NOT NULL,
	"account_last4" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_list_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxpayer_intake" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_recipients" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "email_recipients" ALTER COLUMN "status" SET DEFAULT 'queued'::text;--> statement-breakpoint
DROP TYPE "public"."email_recipient_status";--> statement-breakpoint
CREATE TYPE "public"."email_recipient_status" AS ENUM('queued', 'sent', 'failed', 'unsubscribed');--> statement-breakpoint
ALTER TABLE "email_recipients" ALTER COLUMN "status" SET DEFAULT 'queued'::"public"."email_recipient_status";--> statement-breakpoint
ALTER TABLE "email_recipients" ALTER COLUMN "status" SET DATA TYPE "public"."email_recipient_status" USING "status"::"public"."email_recipient_status";--> statement-breakpoint
ALTER TABLE "social_posts" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "social_posts" ALTER COLUMN "status" SET DEFAULT 'queued'::text;--> statement-breakpoint
DROP TYPE "public"."social_post_status";--> statement-breakpoint
CREATE TYPE "public"."social_post_status" AS ENUM('queued', 'sending', 'sent', 'failed', 'cancelled');--> statement-breakpoint
ALTER TABLE "social_posts" ALTER COLUMN "status" SET DEFAULT 'queued'::"public"."social_post_status";--> statement-breakpoint
ALTER TABLE "social_posts" ALTER COLUMN "status" SET DATA TYPE "public"."social_post_status" USING "status"::"public"."social_post_status";--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD COLUMN "utm_content" text;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD COLUMN "utm_term" text;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD COLUMN "gclid" text;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD COLUMN "fbclid" text;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD COLUMN "landing_path" text;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "dependents" ADD COLUMN "middle_name" varchar(80) NOT NULL;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD COLUMN "list_id" uuid;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD COLUMN "appt_segment" "appointment_audience_segment";--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD COLUMN "manual_recipients_raw" text;--> statement-breakpoint
ALTER TABLE "email_recipients" ADD COLUMN "rendered_subject" text;--> statement-breakpoint
ALTER TABLE "email_recipients" ADD COLUMN "rendered_html" text;--> statement-breakpoint
ALTER TABLE "email_recipients" ADD COLUMN "rendered_text" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "middle_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ssn_last4" varchar(4);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ssn_set_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "utm_content" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "utm_term" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "gclid" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "fbclid" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "landing_path" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "email_list_members" ADD CONSTRAINT "email_list_members_list_id_email_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."email_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxpayer_intake" ADD CONSTRAINT "taxpayer_intake_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_list_members_list_idx" ON "email_list_members" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "email_list_members_email_idx" ON "email_list_members" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "email_list_members_list_email_uq" ON "email_list_members" USING btree ("list_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "taxpayer_intake_user_unique" ON "taxpayer_intake" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_list_id_email_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."email_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependents" DROP COLUMN "ssn_last4";