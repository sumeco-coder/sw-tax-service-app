// app/(admin)/admin/(protected)/email/templates/templates/waitlist/00-invite-approved.mjml.ts
import type { EmailTemplate } from "@/types/email";

export const template: EmailTemplate = {
  id: "waitlist/00-invite-approved",
  name: "Invite Approved (Onboarding Access)",
  category: "waitlist",
  subject: "You’re approved — finish your onboarding ✅",

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
      You’re approved — continue onboarding to get started.
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
                    <td style="padding:22px; font-family:Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#E5E7EB; font-size:16px; line-height:26px;">
                      <p style="margin:0 0 10px 0;">Hi {{first_name}},</p>

                      <p style="margin:0 0 12px 0; font-size:22px; line-height:30px; font-weight:900; color:#F9FAFB;">
                        You’re approved 🎉
                      </p>

                      <p style="margin:0 0 14px 0;">
                        Your {{company_name}} access is ready. Next step is to continue onboarding.
                      </p>

                      <p style="margin:0 0 10px 0; font-weight:800; color:#F9FAFB;">
                        What you’ll do inside onboarding:
                      </p>

                      <p style="margin:0 0 12px 0;">
                        • Confirm your details<br />
                        • Upload your tax documents<br />
                        • Answer a few quick tax questions<br />
                        • (Optional) Schedule a review call
                      </p>

                      <!-- Single CTA -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:10px 0 0 0; width:100%;">
                        <tr>
                          <td class="btn" style="background:#E00040; border-radius:14px;">
                            <a
                              href="{{onboarding_sign_up_url}}"
                              style="display:inline-block; padding:12px 18px; font-size:14px; font-weight:900; color:#ffffff; text-decoration:none; border-radius:14px;"
                            >
                              Continue onboarding
                            </a>
                          </td>
                        </tr>
                      </table>

                      {{#if expires_text}}
                        <p style="margin:12px 0 0 0; font-size:12px; line-height:18px; color:#9CA3AF;">
                          {{expires_text}}
                        </p>
                      {{/if}}

                      <p style="margin:12px 0 0 0; font-size:13px; line-height:20px; color:#9CA3AF;">
                        If the button doesn’t work, copy and paste this link:
                        <br />
                        <a href="{{onboarding_sign_up_url}}" style="color:#FCA5A5; text-decoration:underline; font-weight:800; word-break:break-all;">
                          {{onboarding_sign_up_url}}
                        </a>
                      </p>

                      <hr style="border:none; border-top:1px solid #1F2937; margin:18px 0;" />

                      <p style="margin:0 0 2px 0;">{{signature_name}}</p>

                      <!-- ✅ Divider before footer injection -->
                      <hr style="border:none; border-top:1px solid #1F2937; margin:18px 0 12px;" />

                      <!-- Footer (render-time injection) -->
                      {{#if footer_html}}
                        {{{footer_html}}}
                      {{else}}
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

You’re approved 🎉

Your {{company_name}} access is ready. Next step is to continue onboarding.

What you’ll do inside onboarding:
- Confirm your details
- Upload your tax documents
- Answer a few quick tax questions
- (Optional) Schedule a review call

Continue onboarding:
{{onboarding_sign_up_url}}

{{#if expires_text}}
{{expires_text}}
{{/if}}

{{signature_name}}

Support: {{support_email}}
Website: {{website}}

{{footer_text}}
  `.trim(),

  placeholders: [
    "first_name",
    "company_name",
    "signature_name",
    "support_email",
    "website",

    // ✅ ONLY onboarding link used by this template
    "onboarding_sign_up_url",

    "expires_text",

    "logo_url",
    "logo_alt",
    "logo_link",
    "logo_width",

    "footer_html",
    "footer_text",
    "unsubscribe_link",
  ],
};
