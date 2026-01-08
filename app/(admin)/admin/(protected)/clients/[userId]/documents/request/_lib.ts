// app/(admin)/admin/(protected)/clients/[userId]/documents/request/_lib.ts

export function buildUploadLink() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.swtaxservice.com";

  return `${base.replace(/\/$/, "")}/onboarding/documents`;
}

export function buildRequestDraft(input: {
  clientName: string;
  uploadLink: string;
  due?: string;
  note?: string;
  items: string[];
}) {
  const dueLine = input.due ? `Due date: ${input.due}` : "";
  const itemsList = input.items.length
    ? input.items.map((x) => `• ${x}`).join("\n")
    : "• (No items selected)";

  const subject = input.items.length
    ? `Documents needed to finish your tax return (${input.items.length})`
    : "Documents needed to finish your tax return";

  const text = [
    `Hi ${input.clientName},`,
    "",
    "To move forward with your tax return, please upload the following:",
    itemsList,
    "",
    dueLine ? dueLine : "",
    "",
    input.note ? `Note: ${input.note}` : "",
    "",
    `Upload here: ${input.uploadLink}`,
    "",
    "Thank you,",
    "SW Tax Service",
  ]
    .filter(Boolean)
    .join("\n");

  const htmlItems = input.items.length
    ? `<ul>${input.items.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
    : `<p><em>No items selected.</em></p>`;

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5;">
      <p>Hi ${escapeHtml(input.clientName)},</p>
      <p>To move forward with your tax return, please upload the following:</p>
      ${htmlItems}
      ${input.due ? `<p><strong>Due date:</strong> ${escapeHtml(input.due)}</p>` : ""}
      ${input.note ? `<p><strong>Note:</strong> ${escapeHtml(input.note)}</p>` : ""}
      <p>
        <a href="${input.uploadLink}" style="display:inline-block; padding:10px 14px; border-radius:12px; background:#111; color:#fff; text-decoration:none; font-weight:600;">
          Upload documents
        </a>
      </p>
      <p style="color:#666; font-size:12px;">If you have trouble uploading, reply to this email and we’ll help.</p>
      <p>— SW Tax Service</p>
    </div>
  `.trim();

  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
