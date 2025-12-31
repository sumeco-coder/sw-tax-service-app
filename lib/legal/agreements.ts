// lib/legal/agreements.ts
export type AgreementKind = "ENGAGEMENT" | "CONSENT_7216_USE" | "CONSENT_PAYMENT";

export const AGREEMENT_VERSION = "2025.1";

export const AGREEMENT_TITLES: Record<AgreementKind, string> = {
  ENGAGEMENT: "Engagement Letter",
  CONSENT_7216_USE: "Consent to Use of Tax Return Information",
  CONSENT_PAYMENT: "Consent for Payment",
};

export const AGREEMENT_TEXT: Record<AgreementKind, string> = {
  ENGAGEMENT: `PASTE YOUR ENGAGEMENT LETTER HERE (exact text)`,
  CONSENT_7216_USE: `PASTE YOUR 7216 CONSENT HERE (exact text)`,
  CONSENT_PAYMENT: `PASTE YOUR PAYMENT CONSENT HERE (exact text)`,
};
