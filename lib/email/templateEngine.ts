// lib/email/templateEngine.ts
import "server-only";

import * as Handlebars from "handlebars";
// If TS complains about default import, use this:
// import mjml2html = require("mjml");
import mjml2html from "mjml";

export type PartialsMap = Record<string, string>;

/**
 * Render a Handlebars template with optional partials.
 * - Keeps unknown vars as blank (normal Handlebars behavior).
 * - Supports {{> partialName}}.
 */
export function renderHandlebars(
  template: string,
  vars: Record<string, any>,
  partials: PartialsMap = {}
) {
  const hb = Handlebars.create();

  // Register partials for this render
  for (const [name, src] of Object.entries(partials)) {
    hb.registerPartial(name, src);
  }

  // Optional helper: {{safe some_html}}
  hb.registerHelper("safe", (value: any) => new hb.SafeString(String(value ?? "")));

  const fn = hb.compile(template ?? "", {
    strict: false,
    noEscape: false, // still escapes unless you use SafeString or triple-stash
  });

  return fn(vars ?? {});
}

/** Mark a string as safe HTML (won't be escaped by Handlebars). */
export function safeHtml(html: string) {
  return new Handlebars.SafeString(String(html ?? ""));
}

/** Detect if a template is MJML. */
export function isMjml(input: string) {
  const s = (input ?? "").trim().toLowerCase();
  return s.startsWith("<mjml") || s.includes("<mjml") || s.includes("<mj-body");
}

/** Compile MJML -> responsive HTML email markup. */
export function compileMjmlToHtml(mjmlSource: string) {
  const out = mjml2html(mjmlSource ?? "", {
    validationLevel: "soft",
    keepComments: false,
    minify: false,
  });

  // mjml returns warnings/errors in out.errors
  if (out?.errors?.length) {
    const msg = out.errors
      .map((e: any) => e.formattedMessage || e.message || String(e))
      .join(" | ");
    // Soft validation can still produce output; throw if you want strict behavior
    throw new Error(`MJML error: ${msg}`);
  }

  return out.html;
}
