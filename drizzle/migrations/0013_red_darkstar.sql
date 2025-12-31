CREATE TABLE "message_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor_user_id" uuid,
	"actor_role" "user_role",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
