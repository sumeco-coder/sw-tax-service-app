// lib/helpers/email-utils.ts
import crypto from "crypto";
import type { Recipient } from "@/types/email";

export function now() {
  return new Date();
}

export function normalizeEmail(email: string) {
  return String(email ?? "").toLowerCase().trim();
}

export function makeToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function dedupeEmails(list: Recipient[]) {
  const s = new Set<string>();
  const out: Recipient[] = [];
  for (const r of list) {
    const e = normalizeEmail(r.email);
    if (!e) continue;
    if (s.has(e)) continue;
    s.add(e);
    out.push({ email: e });
  }
  return out;
}

export function parseManualRecipients(input?: string, limit = 5000): Recipient[] {
  const raw = (input ?? "").trim();
  if (!raw) return [];

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const emails = raw
    .split(/[\n,;]+/g)
    .map((x) => normalizeEmail(x))
    .filter((e) => e && emailRe.test(e));

  const unique = [...new Set(emails)];
  return unique.slice(0, limit).map((email) => ({ email }));
}

export function parseTags(input?: string): string[] {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return [];
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return [...new Set(tags)];
}

export function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Replace ONLY keys we know (defaults) and leave all other {{tokens}} untouched.
 * - supports {{key}} and {{{key}}}
 */
export function fillKnownDefaultsKeepUnknown(
  input: string,
  vars: Record<string, string>
) {
  let out = String(input ?? "");
  for (const [k, v] of Object.entries(vars)) {
    const safeV = String(v ?? "");
    const re = new RegExp(`{{{?\\s*${k}\\s*}?}}`, "g");
    out = out.replace(re, safeV);
  }
  return out;
}
