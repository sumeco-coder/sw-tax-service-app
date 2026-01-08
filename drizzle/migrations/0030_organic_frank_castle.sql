CREATE TYPE "public"."entity_type" AS ENUM('SOLE_PROP', 'LLC', 'S_CORP', 'C_CORP', 'PARTNERSHIP', 'NONPROFIT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."next_step_priority" AS ENUM('LOW', 'NORMAL', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."next_step_status" AS ENUM('OPEN', 'DONE');--> statement-breakpoint
CREATE TYPE "public"."notice_agency" AS ENUM('IRS', 'STATE', 'FTB', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."notice_status" AS ENUM('OPEN', 'IN_PROGRESS', 'RESPONDED', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "client_businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tax_year" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"business_name" varchar(140) NOT NULL,
	"ein" varchar(15),
	"entity_type" "entity_type" DEFAULT 'SOLE_PROP' NOT NULL,
	"industry" varchar(120),
	"naics_code" varchar(10),
	"business_start_date" date,
	"business_address" text,
	"has_1099_income" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_next_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(140) NOT NULL,
	"details" text,
	"due_date" date,
	"status" "next_step_status" DEFAULT 'OPEN' NOT NULL,
	"priority" "next_step_priority" DEFAULT 'NORMAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agency" "notice_agency" DEFAULT 'IRS' NOT NULL,
	"notice_number" varchar(30),
	"tax_year" integer,
	"received_date" date,
	"due_date" date,
	"status" "notice_status" DEFAULT 'OPEN' NOT NULL,
	"summary" text,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_businesses" ADD CONSTRAINT "client_businesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_next_steps" ADD CONSTRAINT "client_next_steps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notices" ADD CONSTRAINT "client_notices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_businesses_user_idx" ON "client_businesses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "client_businesses_year_idx" ON "client_businesses" USING btree ("tax_year");--> statement-breakpoint
CREATE INDEX "client_businesses_active_idx" ON "client_businesses" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "client_next_steps_user_idx" ON "client_next_steps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "client_next_steps_due_idx" ON "client_next_steps" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "client_notices_user_idx" ON "client_notices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "client_notices_due_idx" ON "client_notices" USING btree ("due_date");