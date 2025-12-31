CREATE TYPE "public"."identification_type" AS ENUM('DRIVERS_LICENSE', 'STATE_ID', 'PASSPORT', 'OTHER');--> statement-breakpoint
CREATE TABLE "education_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "identification_type" NOT NULL,
	"issuing_state" text,
	"expires_on" date,
	"id_last4" text,
	"front_key" text,
	"back_key" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "education_credits" ADD CONSTRAINT "education_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identifications" ADD CONSTRAINT "identifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "education_credits_user_uniq" ON "education_credits" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identifications_user_unique" ON "identifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "identifications_user_idx" ON "identifications" USING btree ("user_id");