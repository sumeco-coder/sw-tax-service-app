CREATE TYPE "public"."identification_person" AS ENUM('TAXPAYER', 'SPOUSE');--> statement-breakpoint
CREATE TABLE "estimated_state_tax_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimated_tax_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foreign_accounts_digital_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income_documentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualifying_children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "identifications_user_unique";--> statement-breakpoint
ALTER TABLE "identifications" ADD COLUMN "person" "identification_person" NOT NULL;--> statement-breakpoint
ALTER TABLE "estimated_state_tax_payments" ADD CONSTRAINT "estimated_state_tax_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimated_tax_payments" ADD CONSTRAINT "estimated_tax_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foreign_accounts_digital_assets" ADD CONSTRAINT "foreign_accounts_digital_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_documentations" ADD CONSTRAINT "income_documentations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualifying_children" ADD CONSTRAINT "qualifying_children_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "est_state_tax_payments_user_unique" ON "estimated_state_tax_payments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "estimated_tax_payments_user_unique" ON "estimated_tax_payments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "foreign_accounts_digital_assets_user_unique" ON "foreign_accounts_digital_assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "foreign_accounts_digital_assets_user_idx" ON "foreign_accounts_digital_assets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "income_documentations_user_unique" ON "income_documentations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "income_documentations_user_idx" ON "income_documentations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qualifying_children_user_unique" ON "qualifying_children" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "qualifying_children_user_idx" ON "qualifying_children" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identifications_user_person_unique" ON "identifications" USING btree ("user_id","person");