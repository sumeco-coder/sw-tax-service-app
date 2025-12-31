// lib/auth/types.ts

export type AppRole =
  | "TAXPAYER"
  | "AGENCY"
  | "ADMIN"
  | "SUPERADMIN"
  | "LMS_PREPARER"
  | "LMS_ADMIN"
  | "TAX_PREPARER"
  | "SUPPORT_AGENT";

export type ServerUser = {
  userId: string;
  sub: string;
  email: string;
  role: AppRole;
  onboardingStep: string;
};
