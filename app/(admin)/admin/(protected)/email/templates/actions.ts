// app/(admin)/admin/(protected)/email/templates/actions.ts
"use server";

import { ALL_TEMPLATES } from "./_templates";
import { EMAIL_DEFAULTS } from "@/lib/constants/email-defaults";
import { renderString } from "@/lib/helpers/render-template";
import type { TemplateVars } from "@/types/email";
import { compileMjmlToHtmlIfNeeded } from "@/lib/helpers/email-compile.server";
import { buildEmailFooterHTML, buildEmailFooterText } from "@/lib/email/footer";

type AnyTemplate = (typeof ALL_TEMPLATES)[number];

function getTemplateBodySource(t: AnyTemplate) {
  // ✅ Prefer mjml if present, else html, else empty
  const mjml = "mjml" in t ? (t as any).mjml : undefined;
  if (typeof mjml === "string" && mjml.trim()) return mjml;

  const html = "html" in t ? (t as any).html : undefined;
  if (typeof html === "string" && html.trim()) return html;

  return "";
}

export async function listEmailTemplates() {
  return ALL_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    category: "category" in t ? (t as any).category : undefined,
    placeholders: (t as any).placeholders ?? [],
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

  // ✅ Preview-friendly defaults so {{#if footer_html}} works in preview
  if (!v.footer_html) {
    v.footer_html = buildEmailFooterHTML("marketing", {
      companyName: String(v.company_name ?? ""),
      supportEmail: String(v.support_email ?? ""),
      website: String(v.website ?? ""),
      addressLine: "Las Vegas, NV",
      unsubUrl: String(v.unsubscribe_link ?? "") || undefined,
      includeDivider: false,     // template already has <hr> before footer injection
      includeUnsubscribe: false, // template renders unsubscribe separately
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

  if (!v.unsubscribe_link) {
    v.unsubscribe_link = "https://www.swtaxservice.com/unsubscribe";
  }

  // ✅ Get the template body source safely (mjml first, then html)
  const bodySource = getTemplateBodySource(t);

  // ✅ Render variables into subject/body/text
  const renderedSubject = renderString(String(t.subject ?? ""), v);
  const renderedBody = renderString(String(bodySource ?? ""), v);
  const renderedText = renderString(String((t as any).text ?? ""), v);

  // ✅ Compile MJML -> HTML if needed (HTML passes through)
  const html = compileMjmlToHtmlIfNeeded(renderedBody);

  return {
    subject: renderedSubject,
    html,
    text: renderedText,
  };
}
