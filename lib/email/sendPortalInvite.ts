// lib/email/sendPortalInvite.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export function buildPortalInviteEmail(opts: {
  to: string;
  firstName?: string;
  appUrl: string;
  inviteToken: string;
  next?: string;
}) {
  const appUrl = String(opts.appUrl ?? "").replace(/\/$/, "");
  if (!appUrl) throw new Error("Missing APP_URL/appUrl");

  const inviteUrl =
    `${appUrl}/invite/consume?token=${encodeURIComponent(opts.inviteToken)}` +
    (opts.next ? `&next=${encodeURIComponent(opts.next)}` : "");

  // ✅ Use public PNG (SVG can be blocked by email clients)
  const logoUrl = `${appUrl}/swtax-favicon-pack/android-chrome-192x192.png`;

  const subject = "Your SW Tax Service portal access";
  const greeting = opts.firstName ? `Hi ${opts.firstName},` : "Hi,";

  const html = `
  <div style="background:#f6f7fb; padding:32px 12px;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      You’ve been invited to access the SW Tax Service secure client portal.
    </div>

    <div style="max-width:620px; margin:0 auto;">
      <div style="background:#ffffff; border:1px solid #e7e9ef; border-radius:18px; box-shadow:0 12px 30px rgba(17,24,39,.08); overflow:hidden;">
        
        <div style="padding:20px 22px; border-bottom:1px solid #eef0f6; display:flex; align-items:center; gap:12px;">
          <img src="${logoUrl}" width="44" height="44" alt="SW Tax Service"
               style="display:block; border-radius:12px; border:1px solid #eef0f6;" />
          <div style="line-height:1.2;">
            <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:14px; color:#6b7280;">
              SW Tax Service
            </div>
            <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:18px; font-weight:700; color:#111827;">
              Client Portal Invite
            </div>
          </div>
        </div>

        <div style="padding:22px;">
          <p style="margin:0 0 10px 0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:15px; color:#111827;">
            ${greeting}
          </p>

          <p style="margin:0 0 14px 0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:14px; color:#374151; line-height:1.6;">
            You’ve been invited to access your <strong>secure client portal</strong> to complete onboarding, upload documents, and track progress.
          </p>

          <div style="margin:18px 0 14px 0;">
            <a href="${inviteUrl}"
               style="display:inline-block; background:#E00040; color:#ffffff; text-decoration:none; padding:12px 16px; border-radius:12px; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:14px; font-weight:700;">
              Accept Invite
            </a>
          </div>

          <p style="margin:0 0 6px 0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:12px; color:#6b7280;">
            Button not working? Copy and paste this link:
          </p>

          <p style="margin:0; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; font-size:12px; color:#111827; word-break:break-all;">
            ${inviteUrl}
          </p>
        </div>

        <div style="padding:16px 22px; background:#fbfbfd; border-top:1px solid #eef0f6;">
          <p style="margin:0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:12px; color:#6b7280; line-height:1.6;">
            If you didn’t request this invite, you can safely ignore this email.
          </p>
        </div>
      </div>

      <p style="margin:14px 6px 0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:11px; color:#9ca3af; text-align:center;">
        © ${new Date().getFullYear()} SW Tax Service
      </p>
    </div>
  </div>
  `;

  return { subject, html, inviteUrl };
}

export async function sendPortalInviteEmail(opts: {
  to: string;
  firstName?: string;
  appUrl?: string;
  inviteToken: string;
  next?: string;
}) {
  const appUrl = (opts.appUrl ?? process.env.APP_URL ?? "").replace(/\/$/, "");
  if (!appUrl) throw new Error("Missing APP_URL");

  const { subject, html } = buildPortalInviteEmail({
    to: opts.to,
    firstName: opts.firstName,
    appUrl,
    inviteToken: opts.inviteToken,
    next: opts.next,
  });

  const from =
  process.env.RESEND_FROM ??
  process.env.RESEND_FROM_EMAIL ??
  "SW Tax Service <no-reply@swtaxservice.com>";

if (!from) throw new Error("Missing RESEND_FROM/RESEND_FROM_EMAIL");


  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject,
    html,
  });

  if (error) throw new Error(error.message);
  return data;
}
