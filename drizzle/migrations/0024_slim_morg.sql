ALTER TABLE "users" ADD COLUMN "has_paid_for_plan" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "filing_client" boolean DEFAULT false NOT NULL;