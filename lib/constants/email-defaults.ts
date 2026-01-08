// lib/constants/email-defaults.ts
import "server-only";

export const EMAIL_DEFAULTS = {
  company_name: "SW Tax Service",
  waitlist_link: "https://www.swtaxservice.com/waitlist",
  support_email: "support@swtaxservice.com",
  website: "https://www.swtaxservice.com",
  first_name: "there",
  signature_name: "SW Tax Service Team",
  sign_in_link: "https://www.swtaxservice.com/sign-in",
  invite_link: "https://www.swtaxservice.com/sign-up",
  portal_link: "https://www.swtaxservice.com/sign-in",

  logo_url:
    "https://www.swtaxservice.com/swtax-favicon-pack/android-chrome-512x512.png",
  logo_alt: "SW Tax Service",
  logo_link: "https://www.swtaxservice.com",
  logo_width: 72, // ✅ number (not "72px")

  // render-time filled
  unsubscribe_link: "",
  footer_html: "",
  footer_text: "",
} as const;

