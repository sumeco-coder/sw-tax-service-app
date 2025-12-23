// lib/helpers/render-template.ts
import type { TemplateVars } from "../../types/email";


/**
 * Replaces {{key}} tokens with vars[key].
 * Supports optional spaces: {{ key }}.
 *
 * By default, unknown tokens are LEFT IN PLACE so you can detect them later.
 * (Use `strict=false` if you want unknown tokens to become "").
 */
export function renderTemplate(
  input: string,
  vars: TemplateVars = {},
  strict = true
) {
  if (!input) return input;

  return input.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (m, key: string) => {
    const v = (vars as Record<string, any>)[key];
    if (v === null || v === undefined) return strict ? m : "";
    return String(v);
  });
}

/** Backwards compatible name (so old code keeps working) */
export const renderString = renderTemplate;

/** Defaults helper */
export function withDefaults(vars: TemplateVars, defaults: Record<string, string>) {
  // defaults first, then overrides from vars
  return { ...defaults, ...vars } as TemplateVars & Record<string, string>;
}

/** Detect leftover tokens like {{logo_url}} */
export function hasUnrenderedTokens(input: string) {
  return /{{\s*[a-zA-Z0-9_]+\s*}}/.test(input ?? "");
}
