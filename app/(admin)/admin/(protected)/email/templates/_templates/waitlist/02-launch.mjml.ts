// app/(admin)/admin/(protected)/email/templates/waitlist/02-launch.mjml.ts
import type { EmailTemplate } from "@/types/email";

export const template: EmailTemplate = {
  id: "waitlist/02-launch",
  name: "Launch Day",
  category: "waitlist",
  subject: "The waitlist is open — join for priority access ✅",

  html: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>{{company_name}} Waitlist</title>

    <style>
      @media (max-width: 600px) {
        .container { width: 100% !important; }
        .px { padding-left: 16px !important; padding-right: 16px !important; }
        .card { border-radius: 16px !important; }
      }
    </style>
  </head>

  <body style="margin:0; padding:0; background:#0B0F1A;">
    <!-- Preheader -->
    <div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
      Waitlist is open — priority access + the right prep checklist.
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
                        {{company_name}} is opening the waitlist today.
                      </p>

                      <p style="margin:0 0 14px 0;">
                        This is for people who want to get organized <strong>before</strong> tax season gets stressful and rushed.
                      </p>

                      <p style="margin:0 0 6px 0;">You’ll get:</p>

                      <p style="margin:0 0 12px 0;">
                        • Priority access to booking when spots open<br />
                        • A simple prep checklist so you can start gathering what you need<br />
                        • Clear next steps (no confusion)
                      </p>

                      <!-- Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 0 0;">
                        <tr>
                          <td style="background:#E00040; border-radius:14px;">
                            <a
                              href="{{waitlist_link}}"
                              style="display:inline-block; padding:12px 18px; font-size:14px; font-weight:800; color:#ffffff; text-decoration:none; border-radius:14px;"
                            >
                              Join the waitlist
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:10px 0 0 0; font-size:13px; line-height:20px; color:#9CA3AF;">
                        Prefer the link?
                        <a href="{{waitlist_link}}" style="color:#FCA5A5; text-decoration:underline; font-weight:700;">
                          Join the waitlist
                        </a>
                      </p>

                      <hr style="border:none; border-top:1px solid #1F2937; margin:18px 0;" />

                      <p style="margin:0 0 10px 0;">
                        <strong>P.S.</strong> We limit spots so every client gets real attention.
                      </p>

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

{{company_name}} is opening the waitlist today.

This is for people who want to get organized BEFORE tax season gets stressful and rushed.

You’ll get:
- Priority access to booking when spots open
- A simple prep checklist so you can start gathering what you need
- Clear next steps (no confusion)

Join the waitlist:
{{waitlist_link}}

P.S. We limit spots so every client gets real attention.

{{signature_name}}

{{company_name}}
Support: {{support_email}}
Website: {{website}}

{{footer_text}}
  `.trim(),

  placeholders: [
    "first_name",
    "company_name",
    "waitlist_link",
    "signature_name",
    "support_email",
    "website",
    "logo_url",
    "logo_alt",
    "logo_link",
    "logo_width",
    "footer_html",
    "footer_text",
    "unsubscribe_link",
  ],
};
