// Newsletter Template #6 — Hero + 3-column highlights
export const template_newsletter_hero_3col = {
  id: "newsletter_06",
  category: "Newsletter",
  name: "Newsletter Hero + 3 Highlights",
  subject: "{{#if subject_line}}{{subject_line}}{{else}}{{company_name}} — {{month_name}} highlights{{/if}}",
  mjml: `
<mjml>
  <mj-head>
    <mj-preview>{{#if preview_text}}{{preview_text}}{{else}}Top highlights from {{company_name}}{{/if}}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" line-height="26px" color="#111827" />
      <mj-button font-size="14px" font-weight="700" border-radius="12px" padding="14px 18px" />
    </mj-attributes>
  </mj-head>

  <mj-body background-color="#f5f7fb">

    <!-- HEADER (Logo) -->
    <mj-section padding="18px 16px 8px" background-color="#f5f7fb">
      <mj-column>
        {{#if logo_url}}
          <mj-image
            src="{{logo_url}}"
            alt="{{#if logo_alt}}{{logo_alt}}{{else}}{{company_name}}{{/if}}"
            width="{{#if logo_width}}{{logo_width}}{{else}}140px{{/if}}"
            align="left"
            padding="0"
            href="{{#if logo_link}}{{logo_link}}{{else}}{{website}}{{/if}}"
          />
        {{else}}
          <mj-text font-size="18px" font-weight="800" padding="0">{{company_name}}</mj-text>
        {{/if}}
      </mj-column>
    </mj-section>

    <!-- CARD -->
    <mj-section padding="0 16px 16px" background-color="#f5f7fb">
      <mj-column padding="0">
        <mj-wrapper padding="0" background-color="#ffffff" border-radius="18px">

          <!-- HERO IMAGE -->
          {{#if hero_image_url}}
          <mj-section padding="0" background-color="#ffffff" border-radius="18px 18px 0 0">
            <mj-column padding="0">
              <mj-image
                src="{{hero_image_url}}"
                alt="{{#if hero_image_alt}}{{hero_image_alt}}{{else}}Newsletter hero{{/if}}"
                padding="0"
                border-radius="18px 18px 0 0"
                href="{{#if hero_link}}{{hero_link}}{{else}}{{website}}{{/if}}"
              />
            </mj-column>
          </mj-section>
          {{/if}}

          <!-- TITLE + INTRO -->
          <mj-section padding="22px 22px 10px" background-color="#ffffff">
            <mj-column>
              <mj-text font-size="13px" font-weight="800" color="#6b7280" letter-spacing="0.06em" padding="0 0 8px">
                {{#if month_name}}{{month_name}} UPDATE{{else}}UPDATE{{/if}}
              </mj-text>

              {{#if headline}}
                <mj-text font-size="24px" font-weight="900" line-height="32px" padding="0 0 8px">
                  {{headline}}
                </mj-text>
              {{else}}
                <mj-text font-size="24px" font-weight="900" line-height="32px" padding="0 0 8px">
                  What’s new at {{company_name}}
                </mj-text>
              {{/if}}

              {{#if intro}}
                <mj-text font-size="15px" line-height="24px" color="#374151" padding="0">
                  {{intro}}
                </mj-text>
              {{/if}}
            </mj-column>
          </mj-section>

          <!-- 3 HIGHLIGHTS -->
          {{#if highlights.length}}
          <mj-section padding="0 14px 6px" background-color="#ffffff">
            {{#each highlights}}
              <mj-column width="33.33%" padding="8px">
                <mj-section padding="14px" background-color="#ffffff" border="1px solid #e5e7eb" border-radius="14px">
                  <mj-column>
                    {{#if icon}}
                      <mj-text font-size="20px" padding="0 0 8px">{{icon}}</mj-text>
                    {{/if}}

                    <mj-text font-size="15px" font-weight="800" line-height="22px" padding="0 0 6px">
                      {{title}}
                    </mj-text>

                    {{#if desc}}
                      <mj-text font-size="13px" line-height="20px" color="#374151" padding="0 0 10px">
                        {{desc}}
                      </mj-text>
                    {{/if}}

                    {{#if url}}
                      <mj-text font-size="13px" padding="0">
                        <a href="{{url}}" style="color:#E00040; font-weight:700; text-decoration:none;">
                          {{#if cta}}{{cta}}{{else}}Learn more{{/if}} →
                        </a>
                      </mj-text>
                    {{/if}}
                  </mj-column>
                </mj-section>
              </mj-column>
            {{/each}}
          </mj-section>
          {{/if}}

          <!-- OPTIONAL SECONDARY SECTION -->
          {{#if body_sections.length}}
          <mj-section padding="8px 22px 8px" background-color="#ffffff">
            <mj-column>
              <mj-divider border-width="1px" border-style="solid" border-color="#e5e7eb" padding="6px 0 14px" />

              {{#each body_sections}}
                <mj-text font-size="16px" font-weight="900" padding="0 0 6px">{{title}}</mj-text>
                {{#if text}}
                  <mj-text font-size="14px" line-height="22px" color="#374151" padding="0 0 12px">{{text}}</mj-text>
                {{/if}}
                {{#if url}}
                  <mj-text font-size="14px" padding="0 0 14px">
                    <a href="{{url}}" style="color:#E00040; font-weight:700; text-decoration:none;">
                      {{#if cta}}{{cta}}{{else}}Read{{/if}} →
                    </a>
                  </mj-text>
                {{/if}}
              {{/each}}
            </mj-column>
          </mj-section>
          {{/if}}

          <!-- PRIMARY CTA -->
          <mj-section padding="10px 22px 22px" background-color="#ffffff" border-radius="0 0 18px 18px">
            <mj-column>
              <mj-divider border-width="1px" border-style="solid" border-color="#e5e7eb" padding="8px 0 16px" />

              <mj-button
                href="{{#if primary_cta_url}}{{primary_cta_url}}{{else}}{{website}}{{/if}}"
                background-color="#111827"
                color="#ffffff"
                border-radius="12px"
                inner-padding="12px 18px"
                padding="0"
              >
                {{#if primary_cta_label}}{{primary_cta_label}}{{else}}Visit {{company_name}}{{/if}}
              </mj-button>

              {{#if signature}}
                <mj-text font-size="14px" line-height="22px" color="#374151" padding="14px 0 0">
                  — {{signature}}
                </mj-text>
              {{/if}}
            </mj-column>
          </mj-section>

        </mj-wrapper>
      </mj-column>
    </mj-section>

    {{> footer}}
  </mj-body>
</mjml>
  `.trim(),
  text: `
{{#if preview_text}}{{preview_text}}{{else}}Top highlights from {{company_name}}{{/if}}

Hi {{first_name}},

{{#if headline}}{{headline}}{{else}}What’s new at {{company_name}}{{/if}}
{{#if intro}}{{intro}}{{/if}}

{{#if highlights.length}}
Highlights:
{{#each highlights}}
- {{title}}{{#if desc}} — {{desc}}{{/if}}{{#if url}} ({{#if cta}}{{cta}}{{else}}Learn more{{/if}}: {{url}}){{/if}}
{{/each}}
{{/if}}

{{#if body_sections.length}}
More:
{{#each body_sections}}
- {{title}}{{#if text}} — {{text}}{{/if}}{{#if url}} ({{#if cta}}{{cta}}{{else}}Read{{/if}}: {{url}}){{/if}}
{{/each}}
{{/if}}

{{#if primary_cta_label}}{{primary_cta_label}}{{else}}Visit {{company_name}}{{/if}}: {{#if primary_cta_url}}{{primary_cta_url}}{{else}}{{website}}{{/if}}

{{#if signature}}— {{signature}}{{/if}}
{{footer_text}}
  `.trim(),
};
