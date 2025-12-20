// lib/email/templatePlaceholders.ts
import "server-only";
import { EMAIL_PLACEHOLDERS, type EmailPlaceholder } from "@/types/email";

export function extractPlaceholders(input: string): EmailPlaceholder[] {
  const found = new Set<string>();
  input.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    found.add(key);
    return "";
  });

  const allowed = new Set(EMAIL_PLACEHOLDERS);
  return [...found].filter((k): k is EmailPlaceholder => allowed.has(k as any));
}
