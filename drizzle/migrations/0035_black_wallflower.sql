ALTER TABLE "identifications" ADD COLUMN "issue_date" date;--> statement-breakpoint
ALTER TABLE "identifications" ADD COLUMN "id_number_encrypted" text;--> statement-breakpoint
ALTER TABLE "identifications" ADD COLUMN "has_no_id" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "identifications" ADD COLUMN "does_not_want_to_provide" boolean DEFAULT false NOT NULL;