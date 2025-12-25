// app/lib/email/footer.ts (or lib/email/footer.ts)

export type FooterMode = "marketing" | "transactional" | "tax_advice";

export type FooterContext = {
  companyName: string;
  supportEmail: string;
  website: string;

  // Optional
  addressLine?: string; // "Las Vegas, NV" or full address
  unsubUrl?: string; // only if list/bulk

  // Optional controls
  includeDivider?: boolean; // default true
  includeUnsubscribe?: boolean; // default true (if unsubUrl provided)
};

function escapeHtml(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** ✅ Plain HTML footer (dark theme to match your templates) */
export function buildEmailFooterHTML(mode: FooterMode, ctx: FooterContext) {
  const company = escapeHtml(ctx.companyName);
  const support = escapeHtml(ctx.supportEmail);
  const website = escapeHtml(ctx.website);
  const address = ctx.addressLine ? escapeHtml(ctx.addressLine) : "";
  const unsub = ctx.unsubUrl ? escapeHtml(ctx.unsubUrl) : "";

  const includeDivider = ctx.includeDivider ?? true;
  const includeUnsubscribe = ctx.includeUnsubscribe ?? true;

  const divider = includeDivider
    ? `<hr style="border:none;border-top:1px solid #1F2937;margin:18px 0 12px;" />`
    : "";

  const base = `
    ${divider}
    <p style="margin:0;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#9CA3AF;">
      <strong style="color:#F9FAFB;">${company}</strong>${address ? ` • ${address}` : ""}<br/>
      Support: <a href="mailto:${support}" style="color:#FCA5A5;text-decoration:underline;font-weight:700;">${support}</a><br/>
      Website: <a href="${website}" style="color:#FCA5A5;text-decoration:underline;font-weight:700;">${website}</a>
      ${
        unsub && includeUnsubscribe
          ? `<br/><a href="${unsub}" style="color:#FCA5A5;text-decoration:underline;font-weight:700;">Unsubscribe</a>`
          : ""
      }
    </p>
  `.trim();

  if (mode === "marketing") return base;

  const confidentiality = `
    <p style="margin:12px 0 0;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#9CA3AF;">
      This email may include information that is confidential and/or subject to the accountant/client privilege.
      If you are not the intended recipient, please notify us by reply email and then delete this message and destroy any copies.
      This transmission is not intended to and does not waive any privileges.
    </p>
  `.trim();

  if (mode === "transactional") return `${base}\n${confidentiality}`;

  const circular230 = `
    <p style="margin:12px 0 0;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#9CA3AF;">
      U.S. Treasury Department Circular 230 Disclosure: Unless expressly stated otherwise,
      any written advice in this communication is not intended or written to be used,
      and cannot be used, for the purpose of avoiding penalties under the Internal Revenue Code
      or applicable state or local law, or for promoting, marketing, or recommending to another party any transaction or matter addressed herein.
    </p>
  `.trim();

  return `${base}\n${confidentiality}\n${circular230}`;
}

/** ✅ Plain text footer */
export function buildEmailFooterText(mode: FooterMode, ctx: FooterContext) {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`${ctx.companyName}${ctx.addressLine ? ` • ${ctx.addressLine}` : ""}`);
  lines.push(`Support: ${ctx.supportEmail}`);
  lines.push(`Website: ${ctx.website}`);
  if (ctx.unsubUrl) lines.push(`Unsubscribe: ${ctx.unsubUrl}`);

  if (mode === "transactional" || mode === "tax_advice") {
    lines.push("");
    lines.push(
      "This email may include information that is confidential and/or subject to the accountant/client privilege. " +
        "If you are not the intended recipient, please notify us by reply email and then delete this message and destroy any copies. " +
        "This transmission is not intended to and does not waive any privileges."
    );
  }

  if (mode === "tax_advice") {
    lines.push("");
    lines.push(
      "U.S. Treasury Department Circular 230 Disclosure: Unless expressly stated otherwise, any written advice in this communication " +
        "is not intended or written to be used, and cannot be used, for the purpose of avoiding penalties under the Internal Revenue Code " +
        "or applicable state or local law, or for promoting, marketing, or recommending to another party any matter addressed herein."
    );
  }

  return lines.join("\n");
}
