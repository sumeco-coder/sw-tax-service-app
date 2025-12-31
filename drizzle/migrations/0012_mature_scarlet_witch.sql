ALTER TABLE "messages" ALTER COLUMN "body" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "encrypted_body" SET NOT NULL;