// types/email.ts

export const EMAIL_PLACEHOLDERS = [
  "company_name",
  "first_name",
  "signature_name",
  "support_email",
  "website",
  "waitlist_link",
  "sign_in_url",
  "sign_up_url",
  "invite_link",
  "onboarding_sign_up_url",
  "sign_in_link",
  "invite_expires_at",
  "portal_link",
  "expires_text",
  "unsubscribe_link",
  "footer_html",
  "footer_text",
  "logo_url",
  "logo_alt",
  "logo_link",
  "logo_width",
] as const;

export type EmailPlaceholder = (typeof EMAIL_PLACEHOLDERS)[number];

// ✅ extra keys that some templates use
export type KnownTemplateVarKey =
  | "due_date"
  | "accepted_by"
  | "reject_reason"
  | "client_action"
  | `missing_item_${number}`; // ✅ allows missing_item_1,2,3,... without listing all

// ✅ all allowed template var keys
export type TemplateVarKey = EmailPlaceholder | KnownTemplateVarKey;

export type TemplateVars = Partial<
  Record<TemplateVarKey, string | number | boolean | null | undefined>
>;

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  html?: string;
  mjml?: string;
  text: string;

  // ✅ IMPORTANT: widen this too so templates can declare due_date etc
  placeholders: TemplateVarKey[];

  category?: string;
};

// ✅ Standardized email recipient shape
export type Recipient = { email: string };
