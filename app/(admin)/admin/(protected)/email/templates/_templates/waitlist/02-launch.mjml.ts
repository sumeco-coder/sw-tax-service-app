// app/(admin)/admin/(protected)/email/templates/waitlist/02-launch.mjml.ts
import type { EmailTemplate } from "@/types/email";

export const template: EmailTemplate = {
  id: "waitlist/02-launch",
  name: "Launch Day",
  category: "waitlist",
  subject: "The waitlist is open — join for priority access ✅",

  mjml: `
<mjml>
  <mj-head>
    <mj-preview>
      Waitlist is open — priority access + the right prep checklist.
    </mj-preview>

    <mj-attributes>
      <mj-all font-family="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" line-height="26px" color="#E5E7EB" />
      <mj-button font-size="14px" font-weight="800" border-radius="14px" />
    </mj-attributes>

    <mj-style inline="inline">
      .muted { color:#9CA3AF; }
      .link { color:#FCA5A5; text-decoration: underline; font-weight: 700; }
      .h1 { font-size: 22px; line-height: 30px; font-weight: 900; color:#F9FAFB; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#0B0F1A">

    <!-- Outer padding -->
    <mj-wrapper padding="24px 0" background-color="#0B0F1A">

      <!-- Logo row -->
      <mj-section background-color="#0B0F1A" padding="0 16px 12px">
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

      <!-- CARD (one section, one column, no nested sections) -->
      <mj-section
        background-color="#0B1220"
        border-radius="20px"
        padding="22px"
      >
        <mj-column>

          <mj-text padding="0 0 10px">
            Hi {{first_name}},
          </mj-text>

          <mj-text css-class="h1" padding="0 0 12px">
            {{company_name}} is opening the waitlist today.
          </mj-text>

          <mj-text padding="0 0 14px">
            This is for people who want to get organized <strong>before</strong> tax season gets stressful and rushed.
          </mj-text>

          <mj-text padding="0 0 6px">
            You’ll get:
          </mj-text>

          <mj-text padding="0 0 12px">
            • Priority access to booking when spots open<br/>
            • A simple prep checklist so you can start gathering what you need<br/>
            • Clear next steps (no confusion)
          </mj-text>

          <mj-button
            href="{{waitlist_link}}"
            background-color="#E00040"
            color="#ffffff"
            inner-padding="12px 18px"
            padding="4px 0 0"
            align="left"
          >
            Join the waitlist
          </mj-button>

          <mj-text font-size="13px" line-height="20px" css-class="muted" padding="10px 0 0">
            Prefer the link? <a class="link" href="{{waitlist_link}}">Join the waitlist</a>
          </mj-text>

          <mj-divider border-width="1px" border-style="solid" border-color="#1F2937" padding="18px 0" />

          <mj-text padding="0 0 10px">
            <strong>P.S.</strong> We limit spots so every client gets real attention.
          </mj-text>

          <mj-text padding="0 0 2px">
            {{signature_name}}
          </mj-text>

          <mj-text font-size="12px" line-height="18px" css-class="muted" padding="10px 0 0">
            {{company_name}}<br/>
            Support: <a class="link" href="mailto:{{support_email}}">{{support_email}}</a><br/>
            Website: <a class="link" href="{{website}}">{{website}}</a>
          </mj-text>

          <mj-divider border-width="1px" border-style="solid" border-color="#1F2937" padding="18px 0 12px" />

          <!-- Footer (render-time injection) -->
          {{#if footer_html}}
            {{{footer_html}}}
          {{else}}
            <mj-text font-size="12px" line-height="18px" css-class="muted" padding="0">
              {{footer_text}}
            </mj-text>
          {{/if}}

          {{#if unsubscribe_link}}
            <mj-text font-size="12px" line-height="18px" css-class="muted" padding="10px 0 0">
              <a class="link" href="{{unsubscribe_link}}">Unsubscribe</a>
            </mj-text>
          {{/if}}

        </mj-column>
      </mj-section>

    </mj-wrapper>
  </mj-body>
</mjml>
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
