// app/(admin)/admin/(protected)/email/templates/_templates/onboarding/05-filed-confirmation.ts
export const template = {
  id: "onboarding/05-filed-confirmation",
  name: "Filed Confirmation",
  category: "filed",
  subject: "Filed ✅ Your return has been submitted",
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
              Your return has been <strong>filed</strong> successfully.
            </mj-text>

            <mj-text font-size="14px" line-height="22px" color="#555">
              View details here: <a href="{{portal_link}}">{{portal_link}}</a>
            </mj-text>

            <mj-text font-size="16px" line-height="24px">
              We’ll notify you as soon as we receive an IRS/state acceptance update.<br/>
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

Your return has been filed successfully.

View details here: {{portal_link}}

We’ll notify you as soon as we receive an IRS/state acceptance update.
— SW Tax Service

{{footer_text}}
  `.trim(),
};
