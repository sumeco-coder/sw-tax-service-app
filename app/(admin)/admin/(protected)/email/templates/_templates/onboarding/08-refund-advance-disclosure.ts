// app/(admin)/admin/(protected)/email/templates/_templates/onboarding/08-refund-advance-disclosure.ts
export const template = {
  id: "onboarding/08-refund-advance-disclosure",
  name: "Refund Advance Disclosure",
  category: "refund-advance",
  subject: "Refund Advance — important information",
  placeholders: ["first_name", "portal_link", "footer_html", "footer_text"],
  mjml: `
<mjml>
  <mj-body background-color="#f6f7fb">
    <mj-section padding="20px 12px">
      <mj-column>
        <mj-section background-color="#ffffff" padding="18px" border-radius="12px">
          <mj-column>
            <mj-text font-size="16px" line-height="24px">Hi {{first_name}},</mj-text>

            <mj-text font-size="16px" line-height="24px">
              If you choose to apply for a <strong>Refund Advance</strong>, please note:
            </mj-text>

            <mj-text font-size="16px" line-height="26px">
              <ul style="margin:0; padding-left:18px;">
                <li><strong>Refund advances are subject to approval and eligibility.</strong></li>
                <li>Approval decisions and funding timelines are determined by the participating bank/partner.</li>
                <li>Applying does not guarantee approval.</li>
              </ul>
            </mj-text>

            <mj-text font-size="14px" line-height="22px" color="#555">
              Portal: <a href="{{portal_link}}">{{portal_link}}</a>
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

If you choose to apply for a Refund Advance, please note:
- Refund advances are subject to approval and eligibility.
- Approval decisions and funding timelines are determined by the participating bank/partner.
- Applying does not guarantee approval.

Portal: {{portal_link}}
— SW Tax Service

{{footer_text}}
  `.trim(),
};
