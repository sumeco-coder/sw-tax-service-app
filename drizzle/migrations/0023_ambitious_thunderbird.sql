CREATE TYPE "public"."agreement_decision" AS ENUM('SIGNED', 'GRANTED', 'DECLINED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."agreement_kind" AS ENUM('ENGAGEMENT', 'CONSENT_7216_USE', 'CONSENT_PAYMENT');--> statement-breakpoint
ALTER TYPE "public"."onboarding_step" ADD VALUE IF NOT EXISTS 'AGREEMENTS' BEFORE 'SUMMARY';--> statement-breakpoint
ALTER TABLE "client_agreements" ALTER COLUMN "kind" SET DATA TYPE "public"."agreement_kind" USING "kind"::"public"."agreement_kind";--> statement-breakpoint
ALTER TABLE "client_agreements" ALTER COLUMN "decision" SET DEFAULT 'SIGNED'::"public"."agreement_decision";--> statement-breakpoint
ALTER TABLE "client_agreements" ALTER COLUMN "decision" SET DATA TYPE "public"."agreement_decision" USING "decision"::"public"."agreement_decision";