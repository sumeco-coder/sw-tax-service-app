// Newsletter Template #7 — “Plain-text” premium (minimal, super deliverable)
export const template_newsletter_plain_premium = {
  id: "newsletter_07",
  category: "Newsletter",
  name: "Newsletter Plain-Text Style (Premium Minimal)",
  subject: "{{#if subject_line}}{{subject_line}}{{else}}{{company_name}} — quick note for {{month_name}}{{/if}}",
  mjml: `
<mjml>
  <mj-head>
    <mj-preview>{{#if preview_text}}{{preview_text}}{{else}}A quick note from {{company_name}}{{/if}}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" line-height="26px" color="#111827" />
      <mj-button font-size="14px" font-weight="700" border-radius="12px" padding="14px 18px" />
    </mj-attributes>
  </mj-head>

  <mj-body background-color="#ffffff">
    <!-- Simple top bar (logo + tiny divider) -->
    <mj-section padding="18px 16px 8px" background-color="#ffffff">
      <mj-column>
        {{#if logo_url}}
          <mj-image
            src="{{logo_url}}"
            alt="{{#if logo_alt}}{{logo_alt}}{{else}}{{company_name}}{{/if}}"
            width="{{#if logo_width}}{{logo_width}}{{else}}120px{{/if}}"
            align="left"
            padding="0"
            href="{{#if logo_link}}{{logo_link}}{{else}}{{website}}{{/if}}"
          />
        {{else}}
          <mj-text font-size="16px" font-weight="900" padding="0">{{company_name}}</mj-text>
        {{/if}}
      </mj-column>
    </mj-section>

    <mj-section padding="0 16px" background-color="#ffffff">
      <mj-column>
        <mj-divider border-width="1px" border-style="solid" border-color="#e5e7eb" padding="8px 0 16px" />
      </mj-column>
    </mj-section>

    <!-- Main content (looks like a clean personal email) -->
    <mj-section padding="0 16px 12px" background-color="#ffffff">
      <mj-column width="100%">
        <mj-text padding="0 0 10px">Hi {{first_name}},</mj-text>

        {{#if headline}}
          <mj-text font-size="20px" font-weight="900" line-height="28px" padding="0 0 10px">
            {{headline}}
          </mj-text>
        {{/if}}

        {{#if message}}
          <mj-text font-size="16px" line-height="26px" color="#111827" padding="0 0 10px">
            {{{message}}}
          </mj-text>
        {{else}}
          <mj-text font-size="16px" line-height="26px" color="#111827" padding="0 0 10px">
            Just a quick note from {{company_name}}.
          </mj-text>
        {{/if}}

        {{#if bullets.length}}
          <mj-text font-size="16px" line-height="26px" padding="0 0 6px"><strong>Quick points:</strong></mj-text>

          {{#each bullets}}
            <mj-text font-size="16px" line-height="26px" padding="0 0 6px">
              • {{text}}{{#if url}} — <a href="{{url}}" style="color:#E00040; font-weight:700; text-decoration:none;">{{#if cta}}{{cta}}{{else}}link{{/if}}</a>{{/if}}
            </mj-text>
          {{/each}}
        {{/if}}

        {{#if primary_cta_url}}
          <mj-text font-size="16px" line-height="26px" padding="14px 0 0">
            <a href="{{primary_cta_url}}" style="color:#E00040; font-weight:800; text-decoration:none;">
              {{#if primary_cta_label}}{{primary_cta_label}}{{else}}Take action{{/if}} →
            </a>
          </mj-text>
        {{/if}}

        {{#if signature}}
          <mj-text font-size="16px" line-height="26px" padding="18px 0 0">
            — {{signature}}
          </mj-text>
        {{/if}}
      </mj-column>
    </mj-section>

    <!-- Footer note -->
    <mj-section padding="0 16px 22px" background-color="#ffffff">
      <mj-column>
        <mj-divider border-width="1px" border-style="solid" border-color="#e5e7eb" padding="10px 0 12px" />
        <mj-text font-size="12px" line-height="18px" color="#6b7280" padding="0">
          {{footer_text}}
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
  `.trim(),
  text: `
{{#if preview_text}}{{preview_text}}{{else}}A quick note from {{company_name}}{{/if}}

Hi {{first_name}},

{{#if headline}}{{headline}}{{/if}}

{{#if message}}{{message}}{{else}}Just a quick note from {{company_name}}.{{/if}}

{{#if bullets.length}}
Quick points:
{{#each bullets}}
- {{text}}{{#if url}} ({{#if cta}}{{cta}}{{else}}link{{/if}}: {{url}}){{/if}}
{{/each}}
{{/if}}

{{#if primary_cta_label}}{{primary_cta_label}}{{else}}Take action{{/if}}: {{primary_cta_url}}

{{#if signature}}— {{signature}}{{/if}}
{{footer_text}}
  `.trim(),
};
