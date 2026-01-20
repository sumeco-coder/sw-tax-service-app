// app/(admin)/admin/(protected)/email/templates/_templates/onboarding/00-invite.ts
import type { EmailTemplate } from "@/types/email";

export const template: EmailTemplate = {
  id: "onboarding/00-invite",
  name: "Onboarding Invite (Create Account)",
  category: "onboarding",
  subject: "You're invited — finish your onboarding ✅",

  html: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>{{company_name}} Onboarding</title>

    <style>
      @media (max-width: 600px) {
        .container { width: 100% !important; }
        .px { padding-left: 16px !important; padding-right: 16px !important; }
        .card { border-radius: 16px !important; }
        .btn { width: 100% !important; }
        .btn a { display:block !important; text-align:center !important; }
      }
    </style>
  </head>

  <body style="margin:0; padding:0; background:#0B0F1A;">
    <!-- Preheader -->
    <div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
      Your secure onboarding link is ready — create your account and start onboarding.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0B0F1A;">
      <tr>
        <td align="center" style="padding:24px 0;">
          <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:600px;">
            <!-- Logo row -->
            <tr>
              <td class="px" style="padding:0 16px 12px 16px;">
                <a href="{{logo_link}}" style="text-decoration:none;">
                  <img
                    src="{{logo_url}}"
                    width="{{logo_width}}"
                    alt="{{logo_alt}}"
                    border="0"
                    style="display:block; width:{{logo_width}}px; max-width:100%; height:auto;"
                  />
                </a>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td class="px" style="padding:0 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0B1220; border-radius:20px;" class="card">
                  <tr>
                    <td style="padding:22px; font-family:Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#E5E7EB; font-size:16px; line-height:26px;">
                      <p style="margin:0 0 10px 0;">Hi {{first_name}},</p>

                      <p style="margin:0 0 12px 0; font-size:22px; line-height:30px; font-weight:900; color:#F9FAFB;">
                        Your secure onboarding link is ready.
                      </p>

                      <p style="margin:0 0 14px 0;">
                        Please use the button below to create your account and start onboarding.
                      </p>

                      <!-- Primary Button (Outlook-safe) -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 0 0; width:100%;">
                        <tr>
                          <td class="btn" align="center" style="background:#E00040; border-radius:14px; padding:12px 18px;">
                            <a
                              href="{{onboarding_sign_up_url}}"
                              aria-label="Start onboarding"
                              style="display:inline-block; font-size:14px; font-weight:900; color:#ffffff; text-decoration:none; border-radius:14px; mso-padding-alt:12px 18px;"
                            >
                              Start onboarding
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- Secondary Button (Outlook-safe) -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:10px 0 0 0; width:100%;">
                        <tr>
                          <td class="btn" align="center" style="background:#111827; border:1px solid #1F2937; border-radius:14px; padding:12px 18px;">
                            <a
                              href="{{sign_in_link}}"
                              aria-label="Sign in to continue onboarding"
                              style="display:inline-block; font-size:14px; font-weight:900; color:#ffffff; text-decoration:none; border-radius:14px; mso-padding-alt:12px 18px;"
                            >
                              I already have an account (Sign in)
                            </a>
                          </td>
                        </tr>
                      </table>

                      {{#if invite_expires_at}}
                        <p style="margin:12px 0 0 0; font-size:12px; line-height:18px; color:#9CA3AF;">
                          Link expires: {{invite_expires_at}}
                        </p>
                      {{/if}}

                      <p style="margin:12px 0 0 0; font-size:13px; line-height:20px; color:#9CA3AF;">
                        Prefer the link?
                        <a href="{{invite_link}}" style="color:#FCA5A5; text-decoration:underline; font-weight:800;">
                          Start onboarding
                        </a>
                      </p>

                      <hr style="border:none; border-top:1px solid #1F2937; margin:18px 0;" />

                      <p style="margin:0; font-size:12px; line-height:18px; color:#9CA3AF;">
                        <strong>Security note:</strong> Please upload documents through the secure portal whenever possible.
                        Email attachments are not guaranteed to be secure.
                      </p>

                      <p style="margin:16px 0 2px 0;">{{signature_name}}</p>

                      <!-- Divider before footer injection -->
                      <hr style="border:none; border-top:1px solid #1F2937; margin:18px 0 12px;" />

                      <!-- Footer (render-time injection) -->
                      {{#if footer_html}}
                        {{{footer_html}}}
                      {{else}}
                        <p style="margin:0 0 6px 0; font-size:12px; line-height:18px; color:#9CA3AF;">
                          {{company_name}} ·
                          <a href="mailto:{{support_email}}" style="color:#FCA5A5; text-decoration:underline; font-weight:700;">{{support_email}}</a>
                          ·
                          <a href="{{website}}" style="color:#FCA5A5; text-decoration:underline; font-weight:700;">{{website}}</a>
                        </p>
                        <p style="margin:0; font-size:12px; line-height:18px; color:#9CA3AF;">
                          {{footer_text}}
                        </p>
                      {{/if}}

                      {{#if unsubscribe_link}}
                        <p style="margin:10px 0 0 0; font-size:12px; line-height:18px; color:#9CA3AF;">
                          <a href="{{unsubscribe_link}}" style="color:#FCA5A5; text-decoration:underline; font-weight:700;">
                            Unsubscribe
                          </a>
                        </p>
                      {{/if}}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="height:1px; line-height:1px; font-size:1px;">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim(),

  text: `
Hi {{first_name}},

Your secure onboarding link is ready. Please use this link to create your account and start onboarding:
{{invite_link}}

If you already created an account, sign in here:
{{sign_in_link}}

{{#if invite_expires_at}}
Link expires: {{invite_expires_at}}
{{/if}}

Security note: Please upload documents through the secure portal whenever possible. Email attachments are not guaranteed to be secure.

{{signature_name}}

{{company_name}}
Support: {{support_email}}
Website: {{website}}

{{footer_text}}
{{#if unsubscribe_link}}
Unsubscribe: {{unsubscribe_link}}
{{/if}}
  `.trim(),

  placeholders: [
    "first_name",
    "company_name",
    "signature_name",
    "support_email",
    "website",

    "invite_link",
    "sign_in_link",
    "invite_expires_at",

    "logo_url",
    "logo_alt",
    "logo_link",
    "logo_width",

    "footer_html",
    "footer_text",
    "unsubscribe_link",
  ],
};
