CREATE TYPE "public"."document_request_item_status" AS ENUM('requested', 'uploaded', 'waived');--> statement-breakpoint
CREATE TYPE "public"."document_request_status" AS ENUM('open', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "document_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"label" text NOT NULL,
	"doc_type_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"status" "document_request_item_status" DEFAULT 'requested' NOT NULL,
	"uploaded_at" timestamp with time zone,
	"uploaded_document_id" uuid,
	"waived_at" timestamp with time zone,
	"staff_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by" uuid,
	"status" "document_request_status" DEFAULT 'open' NOT NULL,
	"due_date" timestamp with time zone,
	"note" text,
	"reminder_count" integer DEFAULT 0 NOT NULL,
	"last_reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "request_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "request_item_id" uuid;--> statement-breakpoint
ALTER TABLE "document_request_items" ADD CONSTRAINT "document_request_items_request_id_document_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."document_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doc_request_items_req_idx" ON "document_request_items" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "doc_request_items_status_idx" ON "document_request_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "doc_requests_user_idx" ON "document_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "doc_requests_status_idx" ON "document_requests" USING btree ("status");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_request_id_document_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."document_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_request_item_id_document_request_items_id_fk" FOREIGN KEY ("request_item_id") REFERENCES "public"."document_request_items"("id") ON DELETE set null ON UPDATE no action;