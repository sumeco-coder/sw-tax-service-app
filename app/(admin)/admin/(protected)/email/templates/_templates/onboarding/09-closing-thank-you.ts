// app/(admin)/admin/(protected)/email/templates/_templates/onboarding/09-closing-thank-you.ts
export const template = {
  id: "onboarding/09-closing-thank-you",
  name: "Closing / Thank You",
  category: "closing",
  subject: "Your return is complete — thank you",
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
              Your return is complete on our end. If you need amendments, copies, or support later, you can always reach us here.
            </mj-text>

            <mj-text font-size="14px" line-height="22px" color="#555">
              Portal: <a href="{{portal_link}}">{{portal_link}}</a>
            </mj-text>

            <mj-text font-size="16px" line-height="24px">
              Thank you for choosing SW Tax Service.<br/>
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

Your return is complete on our end. If you need amendments, copies, or support later, you can always reach us here.

Portal: {{portal_link}}

Thank you for choosing SW Tax Service.
— SW Tax Service

{{footer_text}}
  `.trim(),
};
