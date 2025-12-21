// app/(admin)/admin/(protected)/email/templates/_templates/newsletter/index.ts

export const NEWSLETTER_TEMPLATES = [
  {
    id: "newsletter_tip_folder",
    category: "Newsletter",
    name: "Monthly Tip: One Folder",
    subject: "{{company_name}} Tip: One habit that makes tax time easier",
    html: `
<div style="font-family:Arial,sans-serif;line-height:1.5">
  <p>Hi {{first_name}},</p>

  <p><strong>This month’s tip:</strong> keep one folder (digital or physical) for tax docs and drop everything in as you receive it.</p>

  <p>It saves time, reduces stress, and makes filing cleaner.</p>

  <p>More resources: <a href="{{website}}">{{website}}</a></p>

  <p>— {{signature_name}}</p>

  {{footer_html}}
</div>
    `.trim(),
    text: `
Hi {{first_name}},

This month’s tip: keep one folder (digital or physical) for tax docs and drop everything in as you receive it.

More resources:
{{website}}

— {{signature_name}}

{{footer_text}}
    `.trim(),
  },
] as const;
