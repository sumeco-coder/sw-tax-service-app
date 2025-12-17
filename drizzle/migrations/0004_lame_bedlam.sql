CREATE TYPE "public"."social_post_status" AS ENUM('queued', 'sending', 'sent', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."social_provider" AS ENUM('facebook', 'instagram', 'x');--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "social_provider" NOT NULL,
	"label" text NOT NULL,
	"page_id" text,
	"ig_user_id" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "social_provider" NOT NULL,
	"account_id" uuid,
	"trigger_key" text,
	"status" "social_post_status" DEFAULT 'queued' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"text_body" text NOT NULL,
	"media_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_account_id_social_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."social_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "social_accounts_provider_idx" ON "social_accounts" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "social_accounts_enabled_idx" ON "social_accounts" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "social_posts_status_scheduled_idx" ON "social_posts" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "social_posts_provider_idx" ON "social_posts" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "social_posts_trigger_idx" ON "social_posts" USING btree ("trigger_key");