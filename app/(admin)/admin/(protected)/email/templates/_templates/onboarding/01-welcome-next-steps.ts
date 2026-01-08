// app/(admin)/admin/(protected)/email/templates/_templates/onboarding/01-welcome-next-steps.ts
export const template = {
  id: "onboarding/01-welcome-next-steps",
  name: "Welcome + Next Steps",
  category: "onboarding",
  subject: "Welcome to SW Tax Service — Next Steps",
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
              Welcome to <strong>SW Tax Service</strong>. To get your return started, please complete these steps:
            </mj-text>

            <mj-text font-size="16px" line-height="26px">
              <ol style="margin:0; padding-left:18px;">
                <li>Complete your onboarding/profile</li>
                <li>Upload your tax documents</li>
                <li>We prepare your return</li>
                <li>You review + e-sign</li>
                <li>We e-file and confirm acceptance</li>
              </ol>
            </mj-text>

            <mj-button href="{{portal_link}}" background-color="#000000" color="#ffffff" border-radius="10px" font-size="14px">
              Open Portal
            </mj-button>

            <mj-text font-size="14px" line-height="22px" color="#555">
              Portal link: <a href="{{portal_link}}">{{portal_link}}</a>
            </mj-text>

            <mj-text font-size="16px" line-height="24px">
              If you have any questions, reply to this email and we’ll help you.<br/>
              — SW Tax Service
            </mj-text>

            <mj-divider border-color="#eeeeee" />

            <mj-text font-size="12px" line-height="18px" color="#666">
              <strong>Security note:</strong> For your protection, please upload documents through the secure portal whenever possible.
              Email attachments are not guaranteed to be secure.
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

Welcome to SW Tax Service. To get your return started, please complete these steps:

Next steps:
1) Complete your onboarding/profile
2) Upload your tax documents
3) We prepare your return
4) You review + e-sign
5) We e-file and confirm acceptance

Open portal: {{portal_link}}

If you have any questions, reply to this email and we’ll help you.
— SW Tax Service

Security note: For your protection, please upload documents through the secure portal whenever possible. Email attachments are not guaranteed to be secure.

{{footer_text}}
  `.trim(),
};
