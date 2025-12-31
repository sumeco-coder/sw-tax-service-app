--CREATE TYPE "public"."appointment_slot_status" AS ENUM('open', 'blocked');--> statement-breakpoint
-- CREATE TABLE "appointment_slots" (
--   "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
--   "starts_at" timestamp with time zone NOT NULL,
--   "duration_minutes" integer DEFAULT 30 NOT NULL,
--   "status" "appointment_slot_status" DEFAULT 'open' NOT NULL,
--   "created_at" timestamp with time zone DEFAULT now() NOT NULL,
--   "updated_at" timestamp with time zone DEFAULT now() NOT NULL
-- );

--> statement-breakpoint
CREATE TABLE "client_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tax_year" text NOT NULL,
	"kind" text NOT NULL,
	"version" text NOT NULL,
	"content_hash" text NOT NULL,
	"decision" text DEFAULT 'SIGNED' NOT NULL,
	"taxpayer_name" text NOT NULL,
	"taxpayer_signed_at" timestamp with time zone NOT NULL,
	"spouse_required" boolean DEFAULT false NOT NULL,
	"spouse_name" text,
	"spouse_signed_at" timestamp with time zone,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"subject" text,
	"last_message_at" timestamp with time zone DEFAULT now(),
	"last_sender_role" "user_role",
	"last_sender_user_id" uuid,
	"client_unread" integer DEFAULT 0 NOT NULL,
	"admin_unread" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_deposit" (
	"user_id" text NOT NULL,
	"use_direct_deposit" boolean DEFAULT false NOT NULL,
	"account_holder_name" text DEFAULT '' NOT NULL,
	"bank_name" text DEFAULT '' NOT NULL,
	"account_type" text DEFAULT 'checking' NOT NULL,
	"routing_last4" text DEFAULT '' NOT NULL,
	"account_last4" text DEFAULT '' NOT NULL,
	"routing_encrypted" text DEFAULT '' NOT NULL,
	"account_encrypted" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "direct_deposit_accounts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "direct_deposit_accounts" CASCADE;--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "messages_user_idx";--> statement-breakpoint
ALTER TABLE "dependents" ALTER COLUMN "middle_name" SET DEFAULT '';--> statement-breakpoint
--ALTER TABLE "dependents" ADD COLUMN "applied_but_not_received" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "conversation_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "sender_user_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "sender_role" "user_role";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
--ALTER TABLE "tasks" ADD COLUMN "tax_year" integer DEFAULT (EXTRACT(YEAR FROM now()))::int NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_last_sender_user_id_users_id_fk" FOREIGN KEY ("last_sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_slots_starts_idx" ON "appointment_slots" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "conversations_client_idx" ON "conversations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "conversations_last_message_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "direct_deposit_user_id_uq" ON "direct_deposit" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_user_id");--> statement-breakpoint
--CREATE INDEX "tasks_user_year_idx" ON "tasks" USING btree ("user_id","tax_year");--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "sender";