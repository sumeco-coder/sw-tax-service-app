// types/email.ts
import "server-only";

// ✅ 1) Define the ONLY placeholders your system supports
export const EMAIL_PLACEHOLDERS = [
  "company_name",
  "waitlist_link",
  "support_email",
  "website",
  "first_name",
  "signature_name",
  "unsubscribe_link",
  "footer_html",
  "footer_text",
] as const;

export type EmailPlaceholder = (typeof EMAIL_PLACEHOLDERS)[number];

// ✅ 2) Vars must match renderTemplate() support
export type TemplateVars = Partial<Record<EmailPlaceholder, string | number | null | undefined>>;

// ✅ 3) Template type
export type EmailTemplate = {
  id: string;        // "waitlist/01-prelaunch"
  name: string;      // "Waitlist Pre-Launch"
  subject: string;
  html: string;
  text: string;

  // only allowed placeholders
  placeholders: EmailPlaceholder[];

  category?: string; // "waitlist"
};
