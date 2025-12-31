CREATE TABLE "head_of_household_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_payments" ALTER COLUMN "status" SET DEFAULT 'submitted';--> statement-breakpoint
ALTER TABLE "head_of_household_docs" ADD CONSTRAINT "head_of_household_docs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hoh_docs_user_uniq" ON "head_of_household_docs" USING btree ("user_id");