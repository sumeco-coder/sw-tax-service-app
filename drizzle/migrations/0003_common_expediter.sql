CREATE TYPE "public"."email_campaign_segment" AS ENUM('waitlist_pending', 'waitlist_approved', 'waitlist_all');--> statement-breakpoint
ALTER TYPE "public"."email_campaign_status" ADD VALUE 'failed';--> statement-breakpoint
ALTER TABLE "email_recipients" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "email_recipients" ALTER COLUMN "status" SET DEFAULT 'queued'::text;--> statement-breakpoint
DROP TYPE "public"."email_recipient_status";--> statement-breakpoint
CREATE TYPE "public"."email_recipient_status" AS ENUM('queued', 'sent', 'failed', 'unsubscribed');--> statement-breakpoint
ALTER TABLE "email_recipients" ALTER COLUMN "status" SET DEFAULT 'queued'::"public"."email_recipient_status";--> statement-breakpoint
ALTER TABLE "email_recipients" ALTER COLUMN "status" SET DATA TYPE "public"."email_recipient_status" USING "status"::"public"."email_recipient_status";--> statement-breakpoint
ALTER TABLE "email_campaigns" ALTER COLUMN "segment" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "email_campaigns" ALTER COLUMN "segment" SET DATA TYPE "public"."email_campaign_segment" USING "segment"::text::"public"."email_campaign_segment";--> statement-breakpoint
ALTER TABLE "email_campaigns" ALTER COLUMN "segment" SET DEFAULT 'waitlist_pending';--> statement-breakpoint
ALTER TABLE "email_campaigns" ALTER COLUMN "text_body" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "email_recipients" ALTER COLUMN "campaign_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "email_unsubscribes" ALTER COLUMN "unsubscribed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "email_unsubscribes" ALTER COLUMN "unsubscribed_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "email_recipients" ADD COLUMN "unsub_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "email_recipients" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "email_unsubscribes" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "email_recipients" ADD CONSTRAINT "email_recipients_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_recipients_email_idx" ON "email_recipients" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "email_recipients_unsub_token_uq" ON "email_recipients" USING btree ("unsub_token");--> statement-breakpoint
CREATE INDEX "email_recipients_campaign_idx" ON "email_recipients" USING btree ("campaign_id");--> statement-breakpoint
ALTER TABLE "email_unsubscribes" DROP COLUMN "token";--> statement-breakpoint
ALTER TABLE "email_unsubscribes" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "email_unsubscribes" DROP COLUMN "updated_at";--> statement-breakpoint
DROP TYPE "public"."email_segment";