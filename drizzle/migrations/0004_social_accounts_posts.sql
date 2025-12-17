-- Ensure uuid generation works (Drizzle defaultRandom() uses gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint

-- Enums (safe create)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_provider') THEN
    CREATE TYPE "public"."social_provider" AS ENUM ('facebook','instagram','x');
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_post_status') THEN
    CREATE TYPE "public"."social_post_status" AS ENUM ('queued','sending','sent','failed','canceled');
  END IF;
END $$;--> statement-breakpoint

-- Tables
CREATE TABLE IF NOT EXISTS "social_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" "public"."social_provider" NOT NULL,
  "label" text NOT NULL,
  "page_id" text,
  "ig_user_id" text,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "token_expires_at" timestamptz,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "social_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" "public"."social_provider" NOT NULL,
  "account_id" uuid,
  "trigger_key" text,
  "status" "public"."social_post_status" DEFAULT 'queued' NOT NULL,
  "scheduled_at" timestamptz,
  "text_body" text NOT NULL,
  "media_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "result" jsonb,
  "error" text,
  "sent_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint

-- FK (safe add)
DO $$ BEGIN
  ALTER TABLE "social_posts"
    ADD CONSTRAINT "social_posts_account_id_social_accounts_id_fk"
    FOREIGN KEY ("account_id") REFERENCES "public"."social_accounts"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- Indexes
CREATE INDEX IF NOT EXISTS "social_accounts_provider_idx" ON "social_accounts" USING btree ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_accounts_enabled_idx" ON "social_accounts" USING btree ("is_enabled");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "social_posts_status_scheduled_idx" ON "social_posts" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_posts_provider_idx" ON "social_posts" USING btree ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_posts_trigger_idx" ON "social_posts" USING btree ("trigger_key");--> statement-breakpoint
