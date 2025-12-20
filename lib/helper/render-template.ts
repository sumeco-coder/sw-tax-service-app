import type { TemplateVars } from "@/types/email";

export function renderString(input: string, vars: TemplateVars) {
  return input.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

export function withDefaults(vars: TemplateVars, defaults: Record<string, string>) {
  return { ...defaults, ...vars };
}
