ALTER TYPE "public"."email_campaign_status" ADD VALUE IF NOT EXISTS 'cancelled';
--> statement-breakpoint
ALTER TYPE "public"."email_recipient_status" ADD VALUE IF NOT EXISTS 'sending';
--> statement-breakpoint
ALTER TYPE "public"."email_recipient_status" ADD VALUE IF NOT EXISTS 'scheduled';
