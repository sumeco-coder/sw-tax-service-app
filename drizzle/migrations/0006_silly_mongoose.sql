ALTER TABLE "email_campaigns"
ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp with time zone;

ALTER TABLE "email_campaigns"
ADD COLUMN IF NOT EXISTS "scheduler_name" text;
