ALTER TABLE "dependents" ADD COLUMN "ssn_last4" varchar(4);--> statement-breakpoint
ALTER TABLE "dependents" ADD COLUMN "ssn_set_at" timestamp with time zone;