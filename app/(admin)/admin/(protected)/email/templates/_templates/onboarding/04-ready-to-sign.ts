// app/(admin)/admin/(protected)/email/templates/_templates/onboarding/04-ready-to-sign.ts
export const template = {
  id: "onboarding/04-ready-to-sign",
  name: "Ready for Review + E-Sign",
  category: "review",
  subject: "Your return is ready — please review & e-sign",
  placeholders: ["first_name", "portal_link", "due_date", "footer_html", "footer_text"],
  mjml: `
<mjml>
  <mj-body background-color="#f6f7fb">
    <mj-section padding="20px 12px">
      <mj-column>
        <mj-section background-color="#ffffff" padding="18px" border-radius="12px">
          <mj-column>
            <mj-text font-size="16px" line-height="24px">Hi {{first_name}},</mj-text>

            <mj-text font-size="16px" line-height="24px">
              Your tax return is ready for your review and e-signature.
            </mj-text>

            <mj-button href="{{portal_link}}" background-color="#000000" color="#ffffff" border-radius="10px" font-size="14px">
              Review & Sign
            </mj-button>

            <mj-text font-size="14px" line-height="22px" color="#555">
              Requested by: <strong>{{due_date}}</strong> (to avoid delays)<br/>
              Portal link: <a href="{{portal_link}}">{{portal_link}}</a>
            </mj-text>

            <mj-text font-size="16px" line-height="24px">
              After you sign, we will e-file and send confirmation once it’s submitted/accepted.<br/>
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

Your tax return is ready for your review and e-signature.

Review & sign here: {{portal_link}}
Requested by: {{due_date}} (to avoid delays)

After you sign, we will e-file and send confirmation once it’s submitted/accepted.
— SW Tax Service

{{footer_text}}
  `.trim(),
};
