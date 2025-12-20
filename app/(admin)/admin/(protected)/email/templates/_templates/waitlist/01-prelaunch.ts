import type { EmailTemplate } from "@/types/email";

export const template: EmailTemplate = {
  id: "waitlist/01-prelaunch",
  name: "Waitlist Pre-Launch",
  category: "waitlist",
  subject: "Waitlist opens tomorrow (Friday 12/20)",
  html: `
<p>Hi {{first_name}},</p>
<p><strong>{{company_name}}</strong> is opening the waitlist <strong>Friday 12/20</strong>.</p>
<p>This is for people who want to get organized <strong>before</strong> tax season gets stressful and rushed.</p>
<ul>
  <li>Priority access to booking when spots open</li>
  <li>A simple checklist so you can start gathering what you need</li>
  <li>Clear next steps (no confusion)</li>
</ul>
<p><a href="{{waitlist_link}}"><strong>Join the waitlist</strong></a></p>
<p style="margin-top:14px;">P.S. We limit spots so every client gets real attention.</p>
<p>{{signature_name}}</p>
<p style="font-size:12px;line-height:18px;">
  {{company_name}}<br/>
  Support: {{support_email}}<br/>
  Website: {{website}}
</p>
`,
  text: `
Hi {{first_name}},

{{company_name}} is opening the waitlist Friday 12/20.

When you join the waitlist, you’ll get:
- Priority access to booking when spots open
- A simple checklist so you can start gathering what you need
- Clear next steps (no confusion)

Join here: {{waitlist_link}}

P.S. We limit spots so every client gets real attention.

{{signature_name}}

{{company_name}}
Support: {{support_email}}
Website: {{website}}
`,
  placeholders: ["first_name", "waitlist_link", "signature_name", "company_name", "support_email", "website"],
};
