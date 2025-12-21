// app/(admin)/admin/(protected)/email/templates/waitlist/02-launch.mjml.ts
import type { EmailTemplate } from "@/types/email";

export const template: EmailTemplate = {
  id: "waitlist/02-launch",
  name: "Waitlist Launch",
  category: "waitlist",

  // You can keep this, or swap to one of the subject variants below.
  subject: "It’s open ✅ Join the SW Tax Service waitlist",

  mjml: `
<mjml>
  <mj-head>
    <mj-preview>
      Waitlist is open — get the right prep checklist + first access to booking.
    </mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" line-height="26px" color="#111827" />
      <mj-button font-size="14px" font-weight="800" border-radius="12px" padding="14px 18px" />
    </mj-attributes>
  </mj-head>

  <mj-body background-color="#f5f7fb">
    <!-- Header with logo -->
    <mj-section padding="18px 16px 10px" background-color="#f5f7fb">
      <mj-column>
        <mj-image
          src="{{logo_url}}"
          width="{{logo_width}}"
          href="{{logo_link}}"
          alt="{{logo_alt}}"
          align="left"
          padding="0"
        />
      </mj-column>
    </mj-section>

    <!-- Main card -->
    <mj-section padding="0 16px 16px" background-color="#f5f7fb">
      <mj-column padding="0">
        <mj-wrapper padding="0" background-color="#ffffff" border-radius="18px">

          <!-- Intro -->
          <mj-section padding="22px 22px 12px" background-color="#ffffff" border-radius="18px 18px 0 0">
            <mj-column>
              <mj-text padding="0 0 10px">
                Hi {{first_name}},
              </mj-text>

              <mj-text font-size="22px" font-weight="900" line-height="30px" padding="0 0 10px">
                The <span style="font-weight:900;">{{company_name}} waitlist is officially open</span>.
              </mj-text>

              <mj-text font-size="15px" line-height="24px" color="#374151" padding="0 0 10px">
                Join if you want your taxes handled with structure (not last-minute panic).
                We cap spots so every account gets proper attention.
              </mj-text>

              <mj-text font-size="15px" line-height="24px" color="#374151" padding="0 0 16px">
                You’ll get the right prep checklist + first access to booking when we open.
              </mj-text>

              <mj-button
                href="{{waitlist_link}}"
                background-color="#111827"
                color="#ffffff"
                border-radius="12px"
                inner-padding="12px 18px"
                padding="0"
                align="left"
              >
                Join SW Tax Service Waitlist
              </mj-button>

              <mj-text font-size="13px" line-height="20px" color="#6b7280" padding="10px 0 0">
                Or copy/paste this link: {{waitlist_link}}
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Who this is for -->
          <mj-section padding="8px 22px 6px" background-color="#ffffff">
            <mj-column>
              <mj-divider border-width="1px" border-style="solid" border-color="#e5e7eb" padding="10px 0 16px" />

              <mj-text font-size="16px" font-weight="900" padding="0 0 10px">
                Who this is for
              </mj-text>

              <mj-text font-size="15px" line-height="24px" padding="0 0 6px">
                • Individuals & families (W-2, dependents, credits)
              </mj-text>
              <mj-text font-size="15px" line-height="24px" padding="0 0 6px">
                • 1099 / self-employed (write-offs, mileage, tracking)
              </mj-text>
              <mj-text font-size="15px" line-height="24px" padding="0">
                • Small businesses (clean numbers, organized records)
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- PS + signature -->
          <mj-section padding="8px 22px 18px" background-color="#ffffff">
            <mj-column>
              <mj-divider border-width="1px" border-style="solid" border-color="#e5e7eb" padding="10px 0 16px" />

              <mj-text font-size="14px" line-height="22px" color="#374151" padding="0 0 12px">
                <strong>P.S.</strong> Reply with <strong>W-2</strong>, <strong>1099</strong>, or <strong>Business</strong>
                and I’ll send the right prep checklist.
              </mj-text>

              <mj-text padding="0 0 4px">
                {{signature_name}}
              </mj-text>

              <mj-text font-size="12px" line-height="18px" color="#6b7280" padding="8px 0 0">
                {{company_name}}<br/>
                Support: {{support_email}}<br/>
                Website: {{website}}
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Footer (recommended to centralize compliance/unsubscribe here) -->
          <mj-section padding="0 22px 22px" background-color="#ffffff" border-radius="0 0 18px 18px">
            <mj-column>
              {{#if footer_html}}
                <mj-text font-size="12px" line-height="18px" color="#6b7280" padding="0">
                  {{safe footer_html}}
                </mj-text>
              {{else}}
                <mj-text font-size="12px" line-height="18px" color="#6b7280" padding="0">
                  {{footer_text}}
                </mj-text>
              {{/if}}

              {{#if unsubscribe_link}}
                <mj-text font-size="12px" line-height="18px" color="#6b7280" padding="10px 0 0">
                  <a href="{{unsubscribe_link}}" style="color:#6b7280; text-decoration:underline;">Unsubscribe</a>
                </mj-text>
              {{/if}}
            </mj-column>
          </mj-section>

        </mj-wrapper>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
  `.trim(),

  text: `
Hi {{first_name}},

The {{company_name}} waitlist is officially open.

Join if you want your taxes handled with structure (not last-minute panic).
We cap spots so every account gets proper attention.

Join now:
{{waitlist_link}}

Who this is for:
- Individuals & families (W-2, dependents, credits)
- 1099 / self-employed (write-offs, mileage, tracking)
- Small businesses (clean numbers, organized records)

P.S. Reply with W-2, 1099, or Business and I’ll send the right prep checklist.

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
