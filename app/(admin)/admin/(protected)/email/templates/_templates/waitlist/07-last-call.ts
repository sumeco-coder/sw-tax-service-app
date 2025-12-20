import type { EmailTemplate } from "@/types/email";


export const template: EmailTemplate = {
  id: "waitlist/07-last-call",
  name: "Last Call",
  category: "waitlist",
  subject: "Last call: waitlist spots are almost filled",
  html: `
<p>Hi {{first_name}},</p>

<p>Quick heads up — waitlist spots are close to filling.</p>

<p><a href="{{waitlist_link}}"><strong>Join the waitlist</strong></a></p>

<p>If you already joined, you’re good ✅</p>

<p>{{signature_name}}</p>

<p style="font-size:12px;line-height:18px;">
  {{company_name}}<br/>
  Support: {{support_email}}<br/>
  Website: {{website}}
</p>
`,
  text: `
Hi {{first_name}},

Quick heads up — waitlist spots are close to filling.

Join the waitlist: {{waitlist_link}}

If you already joined, you’re good ✅

{{signature_name}}

{{company_name}}
Support: {{support_email}}
Website: {{website}}
`,
  placeholders: ["first_name", "waitlist_link", "signature_name", "company_name", "support_email", "website"],
};
