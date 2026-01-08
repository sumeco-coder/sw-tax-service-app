// app/(admin)/admin/(protected)/email/templates/_templates/onboarding/06-accepted-confirmation.ts
export const template = {
  id: "onboarding/06-accepted-confirmation",
  name: "Accepted Confirmation",
  category: "filed",
  subject: "Accepted ✅ IRS/State accepted your return",
  placeholders: ["first_name", "portal_link", "accepted_by", "footer_html", "footer_text"],
  mjml: `
<mjml>
  <mj-body background-color="#f6f7fb">
    <mj-section padding="20px 12px">
      <mj-column>
        <mj-section background-color="#ffffff" padding="18px" border-radius="12px">
          <mj-column>
            <mj-text font-size="16px" line-height="24px">Hi {{first_name}},</mj-text>

            <mj-text font-size="16px" line-height="24px">
              Good news — your return has been <strong>accepted</strong> ({{accepted_by}}).
            </mj-text>

            <mj-text font-size="16px" line-height="26px">
              <strong>What’s next:</strong>
              <ul style="margin:8px 0 0; padding-left:18px;">
                <li>The IRS/state will process your return</li>
                <li>Refund timing depends on processing and your situation</li>
                <li>If anything changes, we’ll notify you</li>
              </ul>
            </mj-text>

            <mj-text font-size="14px" line-height="22px" color="#555">
              Portal link: <a href="{{portal_link}}">{{portal_link}}</a>
            </mj-text>

            <mj-text font-size="16px" line-height="24px">— SW Tax Service</mj-text>

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

Good news — your return has been accepted ({{accepted_by}}).

What’s next:
- The IRS/state will process your return
- Refund timing depends on processing and your situation
- If anything changes, we’ll notify you

Portal link: {{portal_link}}
— SW Tax Service

{{footer_text}}
  `.trim(),
};
