// lib/helpers/email-compile.server.ts
import "server-only";
import mjml2html from "mjml";

function isMjmlSource(input: string) {
  return /<mjml[\s>]/i.test(String(input ?? ""));
}

export function compileMjmlToHtmlIfNeeded(input: string) {
  const raw = String(input ?? "");
  if (!isMjmlSource(raw)) return raw;

  const out = mjml2html(raw, { validationLevel: "soft", minify: false });

  if (out.errors?.length) {
    console.warn(
      "[email] MJML compile warnings:",
      out.errors.map((e: any) => e.formattedMessage || e.message || e)
    );
  }

  return out.html;
}
