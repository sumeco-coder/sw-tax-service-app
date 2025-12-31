CREATE TYPE "public"."invoice_payment_status" AS ENUM('submitted', 'approved', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'PAYMENT_SUBMITTED' BEFORE 'REFUNDED';--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"method" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid_on" date NOT NULL,
	"reference" text,
	"receipt_key" text,
	"notes" text,
	"status" "invoice_payment_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_payments_invoice_idx" ON "invoice_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_payments_user_idx" ON "invoice_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoice_payments_status_idx" ON "invoice_payments" USING btree ("status");