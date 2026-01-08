// app/(admin)/admin/(protected)/email/templates/_templates/onboarding/03-missing-items.ts
export const template = {
  id: "onboarding/03-missing-items",
  name: "Missing Items (Specific)",
  category: "documents",
  subject: "Action needed — missing items to complete your return",
  placeholders: [
    "first_name",
    "portal_link",
    "missing_item_1",
    "missing_item_2",
    "missing_item_3",
    "footer_html",
    "footer_text",
  ],
  mjml: `
<mjml>
  <mj-body background-color="#f6f7fb">
    <mj-section padding="20px 12px">
      <mj-column>
        <mj-section background-color="#ffffff" padding="18px" border-radius="12px">
          <mj-column>
            <mj-text font-size="16px" line-height="24px">Hi {{first_name}},</mj-text>

            <mj-text font-size="16px" line-height="24px">
              We reviewed your file and need the items below to continue:
            </mj-text>

            <mj-text font-size="16px" line-height="26px">
              <ul style="margin:0; padding-left:18px;">
                <li>{{missing_item_1}}</li>
                <li>{{missing_item_2}}</li>
                <li>{{missing_item_3}}</li>
              </ul>
            </mj-text>

            <mj-button href="{{portal_link}}" background-color="#000000" color="#ffffff" border-radius="10px" font-size="14px">
              Upload Missing Items
            </mj-button>

            <mj-text font-size="14px" line-height="22px" color="#555">
              Upload here: <a href="{{portal_link}}">{{portal_link}}</a>
            </mj-text>

            <mj-text font-size="16px" line-height="24px">
              Once these are uploaded, we can proceed right away.<br/>
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

We reviewed your file and need the items below to continue:

Missing items:
- {{missing_item_1}}
- {{missing_item_2}}
- {{missing_item_3}}

Upload here: {{portal_link}}

Once these are uploaded, we can proceed right away.
— SW Tax Service

Security note: For your protection, please upload documents through the secure portal whenever possible. Email attachments are not guaranteed to be secure.

{{footer_text}}
  `.trim(),
};
