import type { EmailTemplate } from "@/types/email";

export const template: EmailTemplate = {
  id: "waitlist/06-why-us",
  name: "Why Us",
  category: "waitlist",
  subject: "What makes our process simple",
  html: `
<p>Hi {{first_name}},</p>

<p>Most tax problems happen for one reason: <strong>missing info + late organization</strong>.</p>

<p><strong>Our approach is simple:</strong></p>
<ul>
  <li>We gather the right documents (no guessing)</li>
  <li>We organize income/expenses clearly</li>
  <li>We aim for accuracy first, then savings where allowed</li>
</ul>

<p><a href="{{waitlist_link}}"><strong>Join the waitlist</strong></a></p>

<p>{{signature_name}}</p>

<p style="font-size:12px;line-height:18px;">
  {{company_name}}<br/>
  Support: {{support_email}}<br/>
  Website: {{website}}
</p>
`,
  text: `
Hi {{first_name}},

Most tax problems happen for one reason: missing info + late organization.

Our approach is simple:
- We gather the right documents (no guessing)
- We organize income/expenses clearly
- We aim for accuracy first, then savings where allowed

Join the waitlist: {{waitlist_link}}

{{signature_name}}

{{company_name}}
Support: {{support_email}}
Website: {{website}}
`,
  placeholders: ["first_name", "waitlist_link", "signature_name", "company_name", "support_email", "website"],
};
