// lib/helpers/render-template.ts
import type { TemplateVars } from "../../types/email";

/**
 * Minimal mustache-ish renderer:
 * - Supports {{key}} replacements
 * - Supports raw {{{key}}} replacements
 * - Supports {{#if key}}...{{else}}...{{/if}} blocks
 *
 * Unknown tokens are LEFT IN PLACE when strict=true (default).
 */
export function renderTemplate(
  input: string,
  vars: TemplateVars = {},
  strict = true
) {
  if (!input) return input;

  let out = String(input);

  // 1) Handle {{#if key}} ... {{else}} ... {{/if}}
  // Run multiple passes to allow nested blocks (up to a safe limit).
  const ifRe =
    /{{#if\s+([a-zA-Z0-9_]+)\s*}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g;

  for (let i = 0; i < 10; i++) {
    if (!ifRe.test(out)) break;
    out = out.replace(ifRe, (_m, key: string, truthyBlock: string, falsyBlock: string) => {
      const v = (vars as Record<string, any>)[key];
      const ok = !!v; // empty string/null/undefined/0 => false
      return ok ? truthyBlock : (falsyBlock ?? "");
    });
  }

  // 2) Handle raw {{{key}}}
  out = out.replace(/{{{\s*([a-zA-Z0-9_]+)\s*}}}/g, (m, key: string) => {
    const v = (vars as Record<string, any>)[key];
    if (v === null || v === undefined) return strict ? m : "";
    return String(v);
  });

  // 3) Handle normal {{key}}
  out = out.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (m, key: string) => {
    const v = (vars as Record<string, any>)[key];
    if (v === null || v === undefined) return strict ? m : "";
    return String(v);
  });

  return out;
}

/** Backwards compatible name */
export const renderString = renderTemplate;

/** Defaults helper (supports string/number defaults) */
export function withDefaults(
  vars: TemplateVars,
  defaults: Record<string, string | number>
) {
  return { ...defaults, ...vars } as TemplateVars & Record<string, string | number>;
}

/** Detect leftover tokens */
export function hasUnrenderedTokens(input: string) {
  return /{{{?\s*[a-zA-Z0-9_]+\s*}?}}/.test(input ?? "");
}
