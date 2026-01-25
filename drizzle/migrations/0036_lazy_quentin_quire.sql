ALTER TABLE "users" ADD COLUMN "questionnaire_complete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "questionnaire_completed_at" timestamp with time zone;