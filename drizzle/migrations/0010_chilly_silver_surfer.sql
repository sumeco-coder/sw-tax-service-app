ALTER TABLE "conversations" ALTER COLUMN "last_sender_role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "sender_role" SET NOT NULL;