// types/email.ts
import "server-only";

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
  "logo_url",
  "logo_alt",
  "logo_link",
  "logo_width",
] as const;

export type EmailPlaceholder = (typeof EMAIL_PLACEHOLDERS)[number];

export type TemplateVars = Partial<
  Record<EmailPlaceholder, string | number | null | undefined>
>;

// ✅ Allow either MJML or HTML (MJML gets compiled to HTML)
export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;

  // One of these should be present:
  html?: string;
  mjml?: string;

  text: string;

  placeholders: EmailPlaceholder[];
  category?: string;
};
