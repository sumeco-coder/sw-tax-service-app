CREATE TABLE "email_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_lower" text NOT NULL,
	"source" text DEFAULT 'unknown' NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"utm" jsonb,
	"ip" text,
	"user_agent" text,
	"referrer" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submit_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_leads_email_lower_unique" ON "email_leads" USING btree ("email_lower");--> statement-breakpoint
CREATE INDEX "email_leads_last_seen_idx" ON "email_leads" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "email_leads_source_idx" ON "email_leads" USING btree ("source");--> statement-breakpoint
CREATE INDEX "email_leads_optin_idx" ON "email_leads" USING btree ("marketing_opt_in");