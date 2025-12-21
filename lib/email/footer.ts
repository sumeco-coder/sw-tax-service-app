// app/lib/email/footer.ts (or lib/email/footer.ts)
import "server-only";

export type FooterMode = "marketing" | "transactional" | "tax_advice";

export type FooterContext = {
  companyName: string;
  supportEmail: string;
  website: string;

  // Optional
  addressLine?: string; // "Las Vegas, NV" or full address
  unsubUrl?: string; // only if list/bulk
};

function escapeHtml(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** ✅ Plain HTML footer (for non-MJML emails) */
export function buildEmailFooterHTML(mode: FooterMode, ctx: FooterContext) {
  const company = escapeHtml(ctx.companyName);
  const support = escapeHtml(ctx.supportEmail);
  const website = escapeHtml(ctx.website);
  const address = ctx.addressLine ? escapeHtml(ctx.addressLine) : "";
  const unsub = ctx.unsubUrl ? escapeHtml(ctx.unsubUrl) : "";

  const base = `
    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#6b7280;line-height:18px;margin:0;">
      <strong style="color:#111827">${company}</strong>${address ? ` • ${address}` : ""}<br/>
      Support: <a style="color:#6b7280" href="mailto:${support}">${support}</a><br/>
      Website: <a style="color:#6b7280" href="${website}">${website}</a>
      ${unsub ? `<br/> <a style="color:#6b7280" href="${unsub}">Unsubscribe</a>` : ""}
    </p>
  `.trim();

  if (mode === "marketing") return base;

  const confidentiality = `
    <p style="font-size:12px;color:#6b7280;line-height:18px;margin:14px 0 0;">
      This email may include information that is confidential and/or subject to the accountant/client privilege.
      If you are not the intended recipient, please notify us by reply email and then delete this message and destroy any copies.
      This transmission is not intended to and does not waive any privileges.
    </p>
  `.trim();

  if (mode === "transactional") return `${base}\n${confidentiality}`;

  const circular230 = `
    <p style="font-size:12px;color:#6b7280;line-height:18px;margin:14px 0 0;">
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

/** ✅ MJML footer (best for MJML templates) */
export function buildEmailFooterMJML(mode: FooterMode, ctx: FooterContext) {
  const company = escapeHtml(ctx.companyName);
  const support = escapeHtml(ctx.supportEmail);
  const website = escapeHtml(ctx.website);
  const address = ctx.addressLine ? escapeHtml(ctx.addressLine) : "";
  const unsub = ctx.unsubUrl ? escapeHtml(ctx.unsubUrl) : "";

  const base = `
<mj-divider border-width="1px" border-style="solid" border-color="#e5e7eb" padding="18px 0 12px" />
<mj-text font-size="12px" line-height="18px" color="#6b7280" padding="0">
  <strong style="color:#111827">${company}</strong>${address ? ` • ${address}` : ""}<br/>
  Support: <a style="color:#6b7280" href="mailto:${support}">${support}</a><br/>
  Website: <a style="color:#6b7280" href="${website}">${website}</a>
  ${unsub ? `<br/><a style="color:#6b7280" href="${unsub}">Unsubscribe</a>` : ""}
</mj-text>
  `.trim();

  if (mode === "marketing") return base;

  const confidentiality = `
<mj-text font-size="12px" line-height="18px" color="#6b7280" padding="10px 0 0">
  This email may include information that is confidential and/or subject to the accountant/client privilege.
  If you are not the intended recipient, please notify us by reply email and then delete this message and destroy any copies.
  This transmission is not intended to and does not waive any privileges.
</mj-text>
  `.trim();

  if (mode === "transactional") return `${base}\n${confidentiality}`;

  const circular230 = `
<mj-text font-size="12px" line-height="18px" color="#6b7280" padding="10px 0 0">
  U.S. Treasury Department Circular 230 Disclosure: Unless expressly stated otherwise,
  any written advice in this communication is not intended or written to be used,
  and cannot be used, for the purpose of avoiding penalties under the Internal Revenue Code
  or applicable state or local law, or for promoting, marketing, or recommending to another party any transaction or matter addressed herein.
</mj-text>
  `.trim();

  return `${base}\n${confidentiality}\n${circular230}`;
}
