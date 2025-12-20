import type { EmailTemplate } from "@/types/email";

export const template: EmailTemplate = {
  id: "waitlist/02-launch",
  name: "Waitlist Launch",
  category: "waitlist",
  subject: "It’s open ✅ Join the SW Tax Service waitlist",
  html: `
<p>Hi {{first_name}},</p>

<p>The <strong>{{company_name}} waitlist is officially open</strong>.</p>

<p>If you want your taxes handled with structure (not last-minute panic), join now:</p>

<p><a href="{{waitlist_link}}"><strong>Join the waitlist</strong></a></p>

<p><strong>Who this is for:</strong></p>
<ul>
  <li>Individuals & families (W-2, dependents, credits)</li>
  <li>1099/self-employed (write-offs, mileage, tracking)</li>
  <li>Small businesses (clean numbers, organized records)</li>
</ul>

<p>P.S. Reply with <strong>W-2</strong>, <strong>1099</strong>, or <strong>Business</strong> and I’ll send the right prep checklist.</p>

<p>{{signature_name}}</p>

<p style="font-size:12px;line-height:18px;">
  {{company_name}}<br/>
  Support: {{support_email}}<br/>
  Website: {{website}}
</p>
`,
  text: `
Hi {{first_name}},

The {{company_name}} waitlist is officially open.

If you want your taxes handled with structure (not last-minute panic), join now:
{{waitlist_link}}

Who this is for:
- Individuals & families (W-2, dependents, credits)
- 1099/self-employed (write-offs, mileage, tracking)
- Small businesses (clean numbers, organized records)

P.S. Reply with W-2, 1099, or Business and I’ll send the right prep checklist.

{{signature_name}}

{{company_name}}
Support: {{support_email}}
Website: {{website}}
`,
  placeholders: ["first_name", "waitlist_link", "signature_name", "company_name", "support_email", "website"],
};
