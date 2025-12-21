export const template = {
  id: "newsletter_05",
  category: "Newsletter",
  name: "Newsletter With Sections (With Logo)",
  subject: "Update from {{company_name}} — {{month_name}}",
  mjml: `
<mjml>
  <mj-head>
    <mj-preview>{{#if preview_text}}{{preview_text}}{{else}}Your latest update from {{company_name}}{{/if}}</mj-preview>
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
            width="140px"
            align="left"
            padding="0"
            href="{{#if logo_link}}{{logo_link}}{{else}}{{website}}{{/if}}"
          />
        {{else}}
          <mj-text font-size="18px" font-weight="800" padding="0">
            {{company_name}}
          </mj-text>
        {{/if}}
      </mj-column>
    </mj-section>

    <!-- Outer card -->
    <mj-section padding="0 16px 16px" background-color="#f5f7fb">
      <mj-column padding="0">
        <mj-spacer height="8px" />

        <mj-wrapper padding="0" background-color="#ffffff" border-radius="18px">
          <!-- Greeting / intro -->
          <mj-section padding="22px 22px 12px" background-color="#ffffff" border-radius="18px 18px 0 0">
            <mj-column>
              <mj-text font-size="16px" line-height="26px" padding="0">
                Hi {{first_name}},
              </mj-text>

              {{#if headline}}
                <mj-text font-size="22px" font-weight="800" line-height="30px" padding="10px 0 0">
                  {{headline}}
                </mj-text>
              {{/if}}

              {{#if intro}}
                <mj-text font-size="15px" line-height="24px" color="#374151" padding="10px 0 0">
                  {{intro}}
                </mj-text>
              {{/if}}
            </mj-column>
          </mj-section>

          <!-- Optional featured block -->
          {{#if featured}}
          <mj-section padding="0 22px 10px" background-color="#ffffff">
            <mj-column>
              <mj-section padding="16px" background-color="#f9fafb" border-radius="14px">
                <mj-column>
                  <mj-text font-size="13px" font-weight="800" color="#6b7280" letter-spacing="0.06em" padding="0 0 6px">
                    FEATURED
                  </mj-text>

                  <mj-text font-size="18px" font-weight="800" line-height="26px" padding="0 0 6px">
                    {{featured.title}}
                  </mj-text>

                  {{#if featured.desc}}
                    <mj-text font-size="14px" line-height="22px" color="#374151" padding="0 0 12px">
                      {{featured.desc}}
                    </mj-text>
                  {{/if}}

                  {{#if featured.url}}
                    <mj-button
                      href="{{featured.url}}"
                      background-color="#E00040"
                      color="#ffffff"
                      inner-padding="12px 16px"
                      border-radius="12px"
                      padding="0"
                      align="left"
                    >
                      {{#if featured.cta}}{{featured.cta}}{{else}}Read more{{/if}}
                    </mj-button>
                  {{/if}}
                </mj-column>
              </mj-section>
            </mj-column>
          </mj-section>
          {{/if}}

          <!-- Quick updates -->
          <mj-section padding="0 22px 10px" background-color="#ffffff">
            <mj-column>
              <mj-divider border-width="1px" border-style="solid" border-color="#e5e7eb" padding="6px 0 14px" />

              <mj-text font-size="15px" font-weight="800" padding="0 0 10px">
                Quick updates
              </mj-text>

              {{#if items.length}}
                {{#each items}}
                  <mj-section padding="0 0 10px" background-color="#ffffff">
                    <mj-column>
                      <mj-section padding="14px 14px" background-color="#ffffff" border="1px solid #e5e7eb" border-radius="14px">
                        <mj-column>
                          <mj-text font-size="15px" font-weight="800" line-height="22px" padding="0 0 6px">
                            {{title}}
                          </mj-text>

                          {{#if desc}}
                            <mj-text font-size="14px" line-height="22px" color="#374151" padding="0">
                              {{desc}}
                            </mj-text>
                          {{/if}}

                          {{#if url}}
                            <mj-text font-size="14px" padding="10px 0 0">
                              <a href="{{url}}" style="color:#E00040; font-weight:700; text-decoration:none;">
                                {{#if cta}}{{cta}}{{else}}View details{{/if}} →
                              </a>
                            </mj-text>
                          {{/if}}
                        </mj-column>
                      </mj-section>
                    </mj-column>
                  </mj-section>
                {{/each}}
              {{else}}
                <mj-text font-size="14px" line-height="22px" color="#374151" padding="0 0 6px">
                  No updates this round — just checking in.
                </mj-text>
              {{/if}}
            </mj-column>
          </mj-section>

          <!-- Primary CTA -->
          <mj-section padding="8px 22px 22px" background-color="#ffffff" border-radius="0 0 18px 18px">
            <mj-column>
              <mj-divider border-width="1px" border-style="solid" border-color="#e5e7eb" padding="8px 0 16px" />

              {{#if cta_text}}
                <mj-text font-size="14px" line-height="22px" color="#374151" padding="0 0 12px">
                  {{cta_text}}
                </mj-text>
              {{/if}}

              <mj-button
                href="{{website}}"
                background-color="#111827"
                color="#ffffff"
                border-radius="12px"
                inner-padding="12px 18px"
                padding="0"
              >
                Visit {{company_name}}
              </mj-button>

              {{#if signature}}
                <mj-text font-size="14px" line-height="22px" color="#374151" padding="14px 0 0">
                  — {{signature}}
                </mj-text>
              {{/if}}
            </mj-column>
          </mj-section>
        </mj-wrapper>

        <mj-spacer height="14px" />
      </mj-column>
    </mj-section>

    {{> footer}}
  </mj-body>
</mjml>
  `.trim(),

  text: `
{{#if preview_text}}{{preview_text}}{{else}}Your latest update from {{company_name}}{{/if}}

Hi {{first_name}},

{{#if headline}}{{headline}}{{/if}}
{{#if intro}}{{intro}}{{/if}}

{{#if featured}}
FEATURED: {{featured.title}}
{{#if featured.desc}}{{featured.desc}}{{/if}}
{{#if featured.url}}{{#if featured.cta}}{{featured.cta}}{{else}}Read more{{/if}}: {{featured.url}}{{/if}}
{{/if}}

Quick updates:
{{#if items.length}}
{{#each items}}
- {{title}}{{#if desc}} — {{desc}}{{/if}}{{#if url}} ({{#if cta}}{{cta}}{{else}}View details{{/if}}: {{url}}){{/if}}
{{/each}}
{{else}}
- No updates this round — just checking in.
{{/if}}

{{#if cta_text}}{{cta_text}}{{/if}}
Visit: {{website}}

{{#if signature}}— {{signature}}{{/if}}
{{footer_text}}
  `.trim(),
};
