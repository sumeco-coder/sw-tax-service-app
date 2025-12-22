// lib/helper/render-template.ts
import type { TemplateVars } from "@/types/email";

/**
 * Replaces {{key}} tokens with vars[key].
 * Supports optional spaces: {{ key }}.
 * Unknown tokens become "".
 */
export function renderTemplate(input: string, vars: TemplateVars = {}) {
  if (!input) return input;

  return input.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, key: string) => {
    const v = (vars as Record<string, string | number | null | undefined>)[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

/** Backwards compatible name (so old code keeps working) */
export const renderString = renderTemplate;

/** Defaults helper */
export function withDefaults(
  vars: TemplateVars,
  defaults: Record<string, string>
) {
  // defaults first, then overrides from vars
  return { ...defaults, ...vars } as TemplateVars & Record<string, string>;
}

/** Detect leftover tokens like {{logo_url}} */
export function hasUnrenderedTokens(input: string) {
  return /{{\s*[a-zA-Z0-9_]+\s*}}/.test(input ?? "");
}
