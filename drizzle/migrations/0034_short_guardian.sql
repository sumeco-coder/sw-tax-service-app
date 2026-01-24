CREATE TABLE "dependent_questionnaires" (
	"dependent_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_agreements"
ADD COLUMN IF NOT EXISTS "tax_return_id" uuid;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'TAXPAYER' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "agency_id" uuid;--> statement-breakpoint
ALTER TABLE "dependent_questionnaires" ADD CONSTRAINT "dependent_questionnaires_dependent_id_dependents_id_fk" FOREIGN KEY ("dependent_id") REFERENCES "public"."dependents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependent_questionnaires" ADD CONSTRAINT "dependent_questionnaires_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dependent_questionnaires_user_idx" ON "dependent_questionnaires" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "client_agreements" ADD CONSTRAINT "client_agreements_tax_return_id_tax_returns_id_fk" FOREIGN KEY ("tax_return_id") REFERENCES "public"."tax_returns"("id") ON DELETE cascade ON UPDATE no action;