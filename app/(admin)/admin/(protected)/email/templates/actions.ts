"use server";

import { ALL_TEMPLATES } from "./_templates";
import { EMAIL_DEFAULTS } from "@/lib/constants/email-defaults";
import { renderString, withDefaults } from "@/lib/helper/render-template";
import type { TemplateVars } from "@/types/email";

// ✅ add these
import { isMjml, compileMjmlToHtml } from "@/lib/email/templateEngine";

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

  const v = withDefaults(vars, EMAIL_DEFAULTS);

  // ✅ MJML-first body source
  const bodySource = (t.mjml ?? t.html ?? "") as string;

  // ✅ render variables (your current engine)
  const renderedBody = renderString(bodySource, v);

  // ✅ compile MJML -> HTML if needed
  const html = isMjml(renderedBody) ? compileMjmlToHtml(renderedBody) : renderedBody;

  return {
    subject: renderString(t.subject ?? "", v),
    html,
    text: renderString(t.text ?? "", v),
  };
}
