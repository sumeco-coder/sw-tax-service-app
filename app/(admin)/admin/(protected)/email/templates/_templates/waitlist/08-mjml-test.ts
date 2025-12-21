export const template = {
  id: "waitlist_08_mjml_test",
  category: "Waitlist",
  name: "MJML Test (Header + Button)",
  subject: "MJML Test — {{company_name}}",
  html: `
<mjml>
  <mj-body background-color="#f5f7fb">
    {{> header}}

    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>
        <mj-text font-size="16px" line-height="24px">
          Hi {{first_name}},
        </mj-text>

        <mj-text font-size="14px" line-height="22px">
          This email is using MJML + Handlebars.
        </mj-text>

        <mj-button href="{{waitlist_link}}" background-color="#111827" color="#ffffff" border-radius="10px">
          Join the waitlist
        </mj-button>
      </mj-column>
    </mj-section>

    {{> footer}}
  </mj-body>
</mjml>
  `.trim(),
  text: "", // leave blank to auto-generate
};
