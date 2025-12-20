import type { EmailTemplate } from "@/types/email";

export const template: EmailTemplate = {
  id: "waitlist/04-next-steps",
  name: "Waitlist Next Steps",
  category: "waitlist",
  subject: "You’re in — here’s what happens next",
  html: `
<p>Hi {{first_name}},</p>

<p>You’re on the {{company_name}} waitlist ✅</p>

<p><strong>Here’s what happens next:</strong></p>
<ol>
  <li>You’ll receive a short follow-up to confirm what you need</li>
  <li>When a spot opens, you’ll get booking instructions</li>
  <li>You’ll receive a prep checklist so you can start now</li>
</ol>

<p>Reply with <strong>W-2</strong>, <strong>1099</strong>, or <strong>Business</strong> and I’ll send the exact checklist for your situation.</p>

<p>{{signature_name}}</p>

<p style="font-size:12px;line-height:18px;">
  {{company_name}}<br/>
  Support: {{support_email}}<br/>
  Website: {{website}}
</p>
`,
  text: `
Hi {{first_name}},

You’re on the {{company_name}} waitlist ✅

Here’s what happens next:
1) You’ll receive a short follow-up to confirm what you need
2) When a spot opens, you’ll get booking instructions
3) You’ll receive a prep checklist so you can start now

Reply with W-2, 1099, or Business and I’ll send the exact checklist for your situation.

{{signature_name}}

{{company_name}}
Support: {{support_email}}
Website: {{website}}
`,
  placeholders: ["first_name", "signature_name", "company_name", "support_email", "website"],
};
