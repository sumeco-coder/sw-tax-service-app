// types/email.ts

export const EMAIL_PLACEHOLDERS = [
  "company_name",
  "waitlist_link",
  "support_email",
  "website",
  "sign_in_url",
  "sign_up_url",
  "expires_text",
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

export type Recipient = { email: string };

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  html?: string;
  mjml?: string;
  text: string;
  placeholders: EmailPlaceholder[];
  category?: string;
};
