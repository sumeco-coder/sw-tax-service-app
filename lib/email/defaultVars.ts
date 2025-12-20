import "server-only";

export const DEFAULT_EMAIL_VARS = {
  company_name: "SW Tax Service",
  waitlist_link: "https://www.swtaxservice.com/waitlist",
  support_email: "support@swtaxservice.com",
  website: "https://www.swtaxservice.com",
  first_name: "there",
  signature_name: "SW Tax Service Team",

  // ✅ template tokens you’ll actually use
  unsubscribe_link: "", // page unsubscribe (filled per recipient)
  footer_html: "",      // filled at send-time
  footer_text: "",      // filled at send-time
} as const;
