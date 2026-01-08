// lib/email/previewVars.ts
import { EMAIL_DEFAULTS } from "@/lib/constants/email-defaults";
import type { TemplateVars } from "@/types/email";

export const EMAIL_PREVIEW_VARS: Record<string, TemplateVars> = {
  "onboarding/00-invite": {
    ...EMAIL_DEFAULTS,
    first_name: "there",
    invite_link: "https://www.swtaxservice.com/taxpayer/onboarding-sign-up?invite=demo",
    sign_in_link: "https://www.swtaxservice.com/sign-in?invite=demo&next=%2Fonboarding%2Fprofile",
    invite_expires_at: "January 15, 2026",
  },

  // example for whatever template uses portal_link/due_date/etc:
  "docs/01-missing-items": {
    ...EMAIL_DEFAULTS,
    first_name: "there",
    portal_link: "https://www.swtaxservice.com/dsign-in",
    due_date: "January 15, 2026",
    missing_item_1: "W-2 from your employer",
    missing_item_2: "1099-G (unemployment)",
    missing_item_3: "Photo ID (front/back)",
    accepted_by: "IRS",
    reject_reason: "AGI mismatch from prior year",
    client_action: "Confirm your prior-year AGI (or upload last year return)",
  },
};
