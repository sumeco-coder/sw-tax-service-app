DROP INDEX "tax_calc_leads_user_id_idx";--> statement-breakpoint
ALTER TABLE "tax_calculator_leads" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tax_calculator_leads" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "tax_calculator_leads" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "tax_calculator_leads" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
CREATE INDEX "tax_calc_leads_paid_at_idx" ON "tax_calculator_leads" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "tax_calc_leads_stripe_session_idx" ON "tax_calculator_leads" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX "tax_calc_leads_stripe_customer_idx" ON "tax_calculator_leads" USING btree ("stripe_customer_id");