// app/emai/renderTemplate
import "server-only";

export type EmailTemplateVars = Record<string, string | number | null | undefined>;

/**
 * Replaces {{key}} tokens with vars[key].
 * Unknown tokens are replaced with empty string.
 */
export function renderTemplate(input: string, vars: EmailTemplateVars) {
  if (!input) return input;

  return input.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
    const v = vars[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

/** Optional: detect leftover tokens (good to prevent sending junk templates) */
export function hasUnrenderedTokens(input: string) {
  return /{{\s*[a-zA-Z0-9_]+\s*}}/.test(input);
}
