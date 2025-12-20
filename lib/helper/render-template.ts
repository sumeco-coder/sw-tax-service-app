import type { TemplateVars } from "@/types/email";

export function renderString(input: string, vars: TemplateVars) {
  return input.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
    const v = (vars as Record<string, string | number | null | undefined>)[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

export function withDefaults(
  vars: TemplateVars,
  defaults: Record<string, string>
) {
  return { ...defaults, ...vars };
}
