// app/(admin)/admin/(protected)/email/templates/_templates/announcements/index.ts

export const ANNOUNCEMENT_TEMPLATES = [
  {
    id: "announcement_general_update",
    category: "Announcement",
    name: "General Update",
    subject: "{{company_name}} Update",
    html: `
<div style="font-family:Arial,sans-serif;line-height:1.5">
  <p>Hi {{first_name}},</p>

  <p>Quick update from <strong>{{company_name}}</strong>.</p>

  <p>
    Visit us here:
    <a href="{{website}}">{{website}}</a>
  </p>

  <p>Questions? <a href="mailto:{{support_email}}">{{support_email}}</a></p>

  <p>— {{signature_name}}</p>

  {{footer_html}}
</div>
    `.trim(),
    text: `
Hi {{first_name}},

Quick update from {{company_name}}.

Visit:
{{website}}

Questions: {{support_email}}

— {{signature_name}}

{{footer_text}}
    `.trim(),
  },

  {
    id: "announcement_waitlist_reminder",
    category: "Announcement",
    name: "Waitlist Reminder",
    subject: "Reminder: {{company_name}} Waitlist",
    html: `
<div style="font-family:Arial,sans-serif;line-height:1.5">
  <p>Hi {{first_name}},</p>

  <p>Reminder — you can join the {{company_name}} waitlist here:</p>

  <p><a href="{{waitlist_link}}">{{waitlist_link}}</a></p>

  <p>— {{signature_name}}</p>

  {{footer_html}}
</div>
    `.trim(),
    text: `
Hi {{first_name}},

Reminder — you can join the {{company_name}} waitlist here:
{{waitlist_link}}

— {{signature_name}}

{{footer_text}}
    `.trim(),
  },
] as const;
