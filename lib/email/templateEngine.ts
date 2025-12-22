// lib/email/templateEngine.ts
import "server-only";

// ✅ Use the dist build to avoid the webpack warning about require.extensions
import Handlebars from "handlebars";

import mjml2html from "mjml";

export type PartialsMap = Record<string, string>;

/**
 * Render a Handlebars template with optional partials.
 * - Supports {{> partialName}}
 * - Supports {{safe html}}
 */
export function renderHandlebars(
  template: string,
  vars: Record<string, any>,
  partials: PartialsMap = {}
) {
  // Create isolated instance so partials/helpers don’t leak globally
  const hb = Handlebars.create();

  // Register partials for this render
  for (const [name, src] of Object.entries(partials)) {
    hb.registerPartial(name, src);
  }

  // Optional helper: {{safe some_html}}
  hb.registerHelper("safe", (value: any) => new hb.SafeString(String(value ?? "")));

  const fn = hb.compile(String(template ?? ""), {
    strict: false,
    noEscape: false, // still escapes unless SafeString or triple-stash {{{ }}}
  });

  return fn(vars ?? {});
}

/** Mark a string as safe HTML (won't be escaped by Handlebars). */
export function safeHtml(html: string) {
  return new Handlebars.SafeString(String(html ?? ""));
}

/** Detect if a template is MJML. */
export function isMjml(input: string) {
  const s = String(input ?? "").trim().toLowerCase();
  return s.startsWith("<mjml") || s.includes("<mjml") || s.includes("<mj-body");
}

/** Compile MJML -> responsive HTML email markup. */
export function compileMjmlToHtml(mjmlSource: string) {
  const out = mjml2html(String(mjmlSource ?? ""), {
    validationLevel: "soft",
    keepComments: false,
    minify: false,
  });

  if (out?.errors?.length) {
    const msg = out.errors
      .map((e: any) => e.formattedMessage || e.message || String(e))
      .join(" | ");
    throw new Error(`MJML error: ${msg}`);
  }

  return out.html;
}
