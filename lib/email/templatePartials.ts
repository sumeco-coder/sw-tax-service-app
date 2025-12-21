// lib/email/templatePartials.ts
export const EMAIL_PARTIALS = {
  // ✅ MJML header partial
  header: `
<mj-section padding="16px 20px">
  <mj-column>
    {{#if logo_url}}
      <mj-image src="{{logo_url}}" alt="{{company_name}}" width="160px" padding="0 0 10px 0" />
    {{/if}}
    <mj-text font-size="12px" color="#64748b" font-weight="700" padding="0">
      {{company_name}}
    </mj-text>
  </mj-column>
</mj-section>
  `.trim(),

  // ✅ MJML footer partial (we inject footer_text / unsubscribe_link)
  footer: `
<mj-section padding="0 20px 20px 20px">
  <mj-column>
    <mj-divider border-width="1px" border-color="#e5e7eb" />
    <mj-text font-size="12px" color="#64748b" line-height="18px">
      {{{footer_text}}}
    </mj-text>
    <mj-text font-size="12px" color="#64748b">
      <a href="{{unsubscribe_link}}">Unsubscribe</a>
    </mj-text>
  </mj-column>
</mj-section>
  `.trim(),
} as const;
