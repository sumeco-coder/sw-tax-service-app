import type { EmailTemplate } from "@/types/email";


export const template: EmailTemplate = {
  id: "waitlist/05-docs-checklist",
  name: "Docs Checklist",
  category: "waitlist",
  subject: "Save this: tax prep checklist",
  html: `
<p>Hi {{first_name}},</p>

<p>Here are <strong>5 things</strong> to gather now so tax season is smooth:</p>

<ol>
  <li>Any W-2s / 1099s you expect</li>
  <li>Photo ID (and spouse if filing jointly)</li>
  <li>Last year’s tax return (if you have it)</li>
  <li>Dependents info (school/childcare/medical if relevant)</li>
  <li>Income + expense notes (especially if 1099/business)</li>
</ol>

<p>Reply with <strong>W-2</strong>, <strong>1099</strong>, or <strong>Business</strong> and I’ll send a more specific checklist.</p>

<p><a href="{{waitlist_link}}"><strong>Join / view the waitlist</strong></a></p>

<p>{{signature_name}}</p>

<p style="font-size:12px;line-height:18px;">
  {{company_name}}<br/>
  Support: {{support_email}}<br/>
  Website: {{website}}
</p>
`,
  text: `
Hi {{first_name}},

Here are 5 things to gather now so tax season is smooth:

1) Any W-2s / 1099s you expect
2) Photo ID (and spouse if filing jointly)
3) Last year’s tax return (if you have it)
4) Dependents info (school/childcare/medical if relevant)
5) Income + expense notes (especially if 1099/business)

Reply with W-2, 1099, or Business and I’ll send a more specific checklist.

Waitlist link: {{waitlist_link}}

{{signature_name}}

{{company_name}}
Support: {{support_email}}
Website: {{website}}
`,
  placeholders: ["first_name", "waitlist_link", "signature_name", "company_name", "support_email", "website"],
};
