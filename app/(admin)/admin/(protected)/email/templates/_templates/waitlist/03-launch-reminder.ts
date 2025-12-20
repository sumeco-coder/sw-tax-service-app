import type { EmailTemplate } from "@/types/email";

export const template: EmailTemplate = {
  id: "waitlist/03-launch-reminder",
  name: "Waitlist Launch Reminder",
  category: "waitlist",
  subject: "Quick reminder: waitlist is still open",
  html: `
<p>Hi {{first_name}},</p>

<p>Quick reminder: the {{company_name}} waitlist is still open today.</p>

<p><a href="{{waitlist_link}}"><strong>Join the waitlist</strong></a></p>

<p>Not sure what you need? Reply with <strong>W-2</strong>, <strong>1099</strong>, or <strong>Business</strong> — I’ll point you in the right direction.</p>

<p>{{signature_name}}</p>

<p style="font-size:12px;line-height:18px;">
  {{company_name}}<br/>
  Support: {{support_email}}<br/>
  Website: {{website}}
</p>
`,
  text: `
Hi {{first_name}},

Quick reminder: the {{company_name}} waitlist is still open today.

Join the waitlist: {{waitlist_link}}

Not sure what you need? Reply with W-2, 1099, or Business — I’ll point you in the right direction.

{{signature_name}}

{{company_name}}
Support: {{support_email}}
Website: {{website}}
`,
  placeholders: ["first_name", "waitlist_link", "signature_name", "company_name", "support_email", "website"],
};
