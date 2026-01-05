CREATE TABLE "tax_calculator_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_lower" text NOT NULL,
	"user_id" uuid,
	"source" text DEFAULT 'tax-calculator',
	"utm" jsonb,
	"snapshot" jsonb,
	"ip" text,
	"user_agent" text,
	"referrer" text,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tax_calculator_leads" ADD CONSTRAINT "tax_calculator_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tax_calc_leads_email_lower_unique" ON "tax_calculator_leads" USING btree ("email_lower");--> statement-breakpoint
CREATE INDEX "tax_calc_leads_created_at_idx" ON "tax_calculator_leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tax_calc_leads_user_id_idx" ON "tax_calculator_leads" USING btree ("user_id");