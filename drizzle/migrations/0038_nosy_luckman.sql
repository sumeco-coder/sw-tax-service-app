CREATE TYPE "public"."document_status" AS ENUM('new', 'reviewed', 'needs_attention');--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "status" "document_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "attention_note" text;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");