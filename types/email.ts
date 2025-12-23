// types/email.ts

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

// ✅ basic recipient shape used by helpers/actions
export type Recipient = { email: string };

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
