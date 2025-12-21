// app/(admin)/admin/(protected)/email/templates/_templates/appointments/index.ts

export const APPOINTMENT_TEMPLATES = [
  {
    id: "appt_reminder_today",
    category: "Appointments",
    name: "Reminder: Appointment Today",
    subject: "Reminder: your {{company_name}} appointment is today",
    html: `
<div style="font-family:Arial,sans-serif;line-height:1.5">
  <p>Hi {{first_name}},</p>

  <p>This is a reminder that your appointment with <strong>{{company_name}}</strong> is scheduled for today.</p>

  <p>If you need to reschedule, reply to this email.</p>

  <p>— {{signature_name}}</p>

  {{footer_html}}
</div>
    `.trim(),
    text: `
Hi {{first_name}},

Reminder: your appointment with {{company_name}} is scheduled for today.

Need to reschedule? Reply to this email.

— {{signature_name}}

{{footer_text}}
    `.trim(),
  },

  {
    id: "appt_followup",
    category: "Appointments",
    name: "Follow-up After Appointment",
    subject: "Follow-up — next steps with {{company_name}}",
    html: `
<div style="font-family:Arial,sans-serif;line-height:1.5">
  <p>Hi {{first_name}},</p>

  <p>Thanks for meeting with <strong>{{company_name}}</strong>.</p>

  <p>If you have any missing info/documents, just reply to this email and we’ll help.</p>

  <p>— {{signature_name}}</p>

  {{footer_html}}
</div>
    `.trim(),
    text: `
Hi {{first_name}},

Thanks for meeting with {{company_name}}.

If you have any missing info/documents, reply to this email and we’ll help.

— {{signature_name}}

{{footer_text}}
    `.trim(),
  },
] as const;
