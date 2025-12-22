// lib/email/templatePartials.ts
export const EMAIL_PARTIALS = {
  /**
   * MJML header partial
   * - smaller logo (uses {{logo_width}} default)
   * - clickable logo ({{logo_link}})
   * - left aligned, clean spacing
   */
  header: `
<mj-section padding="18px 20px 10px">
  <mj-column>
    {{#if logo_url}}
      <mj-image
        src="{{logo_url}}"
        href="{{logo_link}}"
        alt="{{logo_alt}}"
        width="{{logo_width}}"
        align="left"
        padding="0 0 8px 0"
      />
    {{/if}}

    <mj-text
      font-size="12px"
      color="#64748b"
      font-weight="700"
      padding="0"
      align="left"
    >
      {{company_name}}
    </mj-text>
  </mj-column>
</mj-section>
  `.trim(),

  /**
   * MJML footer partial
   * - clean divider
   * - uses footer_text (plain text)
   * - only shows unsubscribe link if present
   */
  footer: `
<mj-section padding="14px 20px 22px">
  <mj-column>
    <mj-divider border-width="1px" border-color="#e5e7eb" padding="0 0 12px" />

    {{#if footer_text}}
      <mj-text font-size="12px" color="#64748b" line-height="18px" padding="0">
        {{footer_text}}
      </mj-text>
    {{/if}}

    {{#if unsubscribe_link}}
      <mj-text font-size="12px" color="#64748b" padding="10px 0 0">
        <a href="{{unsubscribe_link}}" style="color:#64748b; text-decoration:underline;">
          Unsubscribe
        </a>
      </mj-text>
    {{/if}}
  </mj-column>
</mj-section>
  `.trim(),
} as const;
