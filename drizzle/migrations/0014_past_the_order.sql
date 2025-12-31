ALTER TABLE "messages" ADD COLUMN "encrypted_attachment_meta" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "key_version" text DEFAULT 'v2' NOT NULL;