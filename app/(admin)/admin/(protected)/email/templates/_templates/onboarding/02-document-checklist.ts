// app/(admin)/admin/(protected)/email/templates/_templates/onboarding/02-document-checklist.ts
export const template = {
  id: "onboarding/02-document-checklist",
  name: "Document Checklist Request",
  category: "documents",
  subject: "Your tax filing checklist — upload documents to continue",
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
              To move forward with your return, please upload the items that apply to you.
            </mj-text>

            <mj-text font-size="16px" line-height="26px">
              <strong>Common documents:</strong>
              <ul style="margin:8px 0 0; padding-left:18px;">
                <li>Photo ID (and spouse if filing jointly)</li>
                <li>SSN/ITIN for you + spouse + dependents</li>
                <li>All income forms (W-2, 1099s, 1099-G, SSA-1099, 1099-R, etc.)</li>
                <li>1098-T (tuition), 1098 (mortgage), childcare expenses (if applicable)</li>
                <li>Last year tax return (recommended)</li>
              </ul>
            </mj-text>

            <mj-button href="{{portal_link}}" background-color="#000000" color="#ffffff" border-radius="10px" font-size="14px">
              Upload Documents
            </mj-button>

            <mj-text font-size="14px" line-height="22px" color="#555">
              Upload here: <a href="{{portal_link}}">{{portal_link}}</a>
            </mj-text>

            <mj-text font-size="16px" line-height="24px">
              Once uploaded, we’ll begin the preparation process.<br/>
              — SW Tax Service
            </mj-text>

            <mj-divider border-color="#eeeeee" />

            <mj-text font-size="12px" line-height="18px" color="#666">
              <strong>Security note:</strong> Portal upload is preferred. Email attachments are not guaranteed to be secure.
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

To move forward with your return, please upload the items that apply to you.

Common documents:
- Photo ID (and spouse if filing jointly)
- SSN/ITIN for you + spouse + dependents
- All income forms (W-2, 1099s, 1099-G, SSA-1099, 1099-R, etc.)
- 1098-T (tuition), 1098 (mortgage), childcare expenses (if applicable)
- Last year tax return (recommended)

Upload here: {{portal_link}}

Once uploaded, we’ll begin the preparation process.
— SW Tax Service

Security note: Portal upload is preferred. Email attachments are not guaranteed to be secure.

{{footer_text}}
  `.trim(),
};
