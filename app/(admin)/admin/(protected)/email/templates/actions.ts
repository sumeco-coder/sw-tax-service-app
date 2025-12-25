// app/(admin)/admin/(protected)/email/templates/actions.ts
"use server";

import { ALL_TEMPLATES } from "./_templates";
import { EMAIL_DEFAULTS } from "@/lib/constants/email-defaults";
import { renderString } from "@/lib/helpers/render-template";
import type { TemplateVars } from "@/types/email";
import { compileMjmlToHtmlIfNeeded } from "@/lib/helpers/email-compile.server";
import { buildEmailFooterHTML, buildEmailFooterText } from "@/lib/email/footer";

export async function listEmailTemplates() {
  return ALL_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    category: t.category,
    placeholders: t.placeholders,
  }));
}

export async function getEmailTemplate(templateId: string) {
  const t = ALL_TEMPLATES.find((x) => x.id === templateId);
  if (!t) throw new Error("Template not found");
  return t;
}

export async function renderEmailTemplate(templateId: string, vars: TemplateVars) {
  const t = ALL_TEMPLATES.find((x) => x.id === templateId);
  if (!t) throw new Error("Template not found");

  // ✅ Merge defaults first, then overrides
  const v: Record<string, any> = {
    ...EMAIL_DEFAULTS,
    ...(vars ?? {}),
  };

  // ✅ Preview-friendly defaults:
  // If footer_html/footer_text not provided, generate them so {{#if footer_html}} works.
  if (!v.footer_html) {
    v.footer_html = buildEmailFooterHTML("marketing", {
      companyName: String(v.company_name ?? ""),
      supportEmail: String(v.support_email ?? ""),
      website: String(v.website ?? ""),
      addressLine: "Las Vegas, NV",
      unsubUrl: String(v.unsubscribe_link ?? "") || undefined,
      includeDivider: false,     // your template already has <hr> before footer
      includeUnsubscribe: false, // your template renders unsubscribe separately
    });
  }

  if (!v.footer_text) {
    v.footer_text = buildEmailFooterText("marketing", {
      companyName: String(v.company_name ?? ""),
      supportEmail: String(v.support_email ?? ""),
      website: String(v.website ?? ""),
      addressLine: "Las Vegas, NV",
      unsubUrl: String(v.unsubscribe_link ?? "") || undefined,
    });
  }

  // Optional: give preview an unsubscribe link if blank (so the block can render)
  if (!v.unsubscribe_link) {
    v.unsubscribe_link = "https://www.swtaxservice.com/unsubscribe";
  }

  // ✅ MJML-first body source
  const bodySource = String(t.mjml ?? t.html ?? "");

  // ✅ Render variables into body/subject/text
  const renderedSubject = renderString(String(t.subject ?? ""), v);
  const renderedBody = renderString(bodySource, v);
  const renderedText = renderString(String(t.text ?? ""), v);

  // ✅ Compile MJML -> HTML if needed (HTML passes through)
  const html = compileMjmlToHtmlIfNeeded(renderedBody);

  return {
    subject: renderedSubject,
    html,
    text: renderedText,
  };
}
