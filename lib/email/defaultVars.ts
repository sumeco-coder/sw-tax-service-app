// lib/email/defaultVars.ts
import type { TemplateVars } from "@/types/email";

export const EMAIL_DEFAULT_VARS: TemplateVars = {
  company_name: "SW Tax Service",
  support_email: "support@swtaxservice.com",
  website: "https://www.swtaxservice.com",
  signature_name: "Sumeco Wynn",
  first_name: "there",
  waitlist_link: "https://www.swtaxservice.com/waitlist",
  sign_in_url: "https://www.swtaxservice.com/sign-in",
  sign_up_url: "https://www.swtaxservice.com/sign-up",

  invite_link: "https://www.swtaxservice.com/taxpayer/onboarding-sign-up?invite=demo",
  sign_in_link: "https://www.swtaxservice.com/sign-in?invite=demo&next=%2Fonboarding%2Fprofile",
  portal_link: "https://www.swtaxservice.com/sign-in?invite=demo&next=%2Fonboarding%2Fprofile",
  invite_expires_at: "Jan 15, 2026",
  expires_text: "Link expires: Jan 15, 2026",

  unsubscribe_link: "https://www.swtaxservice.com/unsubscribe?token=demo",

  logo_url: "https://www.swtaxservice.com/swtax-favicon-pack/android-chrome-512x512.png",
  logo_alt: "SW Tax Service",
  logo_link: "https://www.swtaxservice.com",
  logo_width: 72, // ✅ number
};
