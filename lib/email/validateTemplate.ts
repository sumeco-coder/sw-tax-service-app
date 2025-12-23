// lib/email/validateTemplate.ts

import { extractPlaceholders } from "@/lib/email/templatePlaceholders";
import { EMAIL_PLACEHOLDERS, type EmailPlaceholder } from "@/types/email";

type ValidateInput = {
  subject: string;
  html?: string | null;
  mjml?: string | null;
  text?: string | null;
  category?: string | null; // "marketing" | "transactional" etc (your choice)
};

type ValidationResult =
  | { ok: true; placeholders: EmailPlaceholder[] }
  | { ok: false; error: string; placeholders: EmailPlaceholder[] };

const REQUIRED_MARKETING: EmailPlaceholder[] = ["unsubscribe_link"]; // keep simple
// If you prefer footer-based requirement instead, see notes below.

function normalize(s: unknown) {
  return String(s ?? "");
}

export function validateEmailTemplate(input: ValidateInput): ValidationResult {
  const subject = normalize(input.subject);
  const body = normalize(input.html ?? input.mjml ?? "");
  const text = normalize(input.text);

  // Find placeholders used anywhere
  const used = new Set<EmailPlaceholder>([
    ...extractPlaceholders(subject),
    ...extractPlaceholders(body),
    ...extractPlaceholders(text),
  ]);

  const usedArr = [...used];

  // 1) Ensure you have at least one body format
  if (!body.trim()) {
    return { ok: false, error: "Template body is missing (html/mjml).", placeholders: usedArr };
  }

  // 2) Detect unknown tokens (optional strict mode)
  // This catches tokens like {{bad_token}} by scanning and comparing.
  // extractPlaceholders only returns allowed tokens, so we do a second scan:
  const tokenRegex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
  const allFound = new Set<string>();
  for (const s of [subject, body, text]) {
    s.replace(tokenRegex, (_, key) => {
      allFound.add(String(key));
      return "";
    });
  }
  const allowed = new Set<string>(EMAIL_PLACEHOLDERS as unknown as string[]);
  const unknown = [...allFound].filter((k) => !allowed.has(k));

  if (unknown.length) {
    return {
      ok: false,
      error: `Unknown placeholder(s): ${unknown.map((t) => `{{${t}}}`).join(", ")}`,
      placeholders: usedArr,
    };
  }

  // 3) Marketing compliance requirement (unsubscribe)
  const category = String(input.category ?? "").toLowerCase();

  if (category === "marketing") {
    const missing = REQUIRED_MARKETING.filter((req) => !used.has(req));
    if (missing.length) {
      return {
        ok: false,
        error: `Marketing templates must include: ${missing.map((t) => `{{${t}}}`).join(", ")}`,
        placeholders: usedArr,
      };
    }
  }

  return { ok: true, placeholders: usedArr };
}
