// app/(admin)/admin/(protected)/email/templates/_templates/onboarding/07-rejected-return.ts
export const template = {
  id: "onboarding/07-rejected-return",
  name: "Rejected Return (Fix Needed)",
  category: "rejected",
  subject: "Important — return rejected (we need one fix)",
  placeholders: ["first_name", "portal_link", "reject_reason", "client_action", "footer_html", "footer_text"],
  mjml: `
<mjml>
  <mj-body background-color="#f6f7fb">
    <mj-section padding="20px 12px">
      <mj-column>
        <mj-section background-color="#ffffff" padding="18px" border-radius="12px">
          <mj-column>
            <mj-text font-size="16px" line-height="24px">Hi {{first_name}},</mj-text>

            <mj-text font-size="16px" line-height="24px">
              Your return was <strong>rejected</strong> due to the issue below:
            </mj-text>

            <mj-text font-size="16px" line-height="24px">
              <strong>Reason:</strong> {{reject_reason}}
            </mj-text>

            <mj-text font-size="16px" line-height="24px">
              <strong>What we need from you:</strong> {{client_action}}
            </mj-text>

            <mj-button href="{{portal_link}}" background-color="#000000" color="#ffffff" border-radius="10px" font-size="14px">
              Open Portal
            </mj-button>

            <mj-text font-size="14px" line-height="22px" color="#555">
              Portal: <a href="{{portal_link}}">{{portal_link}}</a>
            </mj-text>

            <mj-text font-size="16px" line-height="24px">
              Once you reply or update the info, we’ll correct it and re-file.<br/>
              — SW Tax Service
            </mj-text>

            <mj-raw>{{{footer_html}}}</mj-raw>
          </mj-column>
        </mj-section>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
  `.trim(),
  text: `
Hi {{first_name}},

Your return was rejected due to the issue below:

Reason: {{reject_reason}}

What we need from you:
- {{client_action}}

Once you reply or update the info, we’ll correct it and re-file.

Portal: {{portal_link}}
— SW Tax Service

{{footer_text}}
  `.trim(),
};
