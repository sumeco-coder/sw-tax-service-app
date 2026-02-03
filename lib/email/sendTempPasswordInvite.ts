// lib/email/sendTempPasswordInvite.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

/** Only allow internal app paths to avoid open-redirect attacks */
function safeInternalPath(input: unknown, fallback: string) {
  const raw = String(input ?? "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;

  // ✅ next here is AFTER onboarding — avoid loops
  if (raw.startsWith("/onboarding")) return fallback;
  if (raw === "/taxpayer/onboarding-sign-up") return fallback;

  return raw;
}

export function buildTempPasswordInviteEmail(opts: {
  to: string;
  firstName?: string;
  appUrl: string;
  tempPassword: string;
  next?: string; // ✅ final destination AFTER onboarding
}) {
  const appUrl = String(opts.appUrl ?? "").replace(/\/$/, "");
  if (!appUrl) throw new Error("Missing APP_URL/appUrl");

  const next = safeInternalPath(opts.next, "/dashboard");

  // Link takes them to sign-in with helpful banner (start=temp), prefilled email, and redirect target.
  const signInUrl =
    `${appUrl}/sign-in` +
    `?start=temp` +
    `&email=${encodeURIComponent(String(opts.to ?? "").trim().toLowerCase())}` +
    (next ? `&next=${encodeURIComponent(next)}` : "");

  // ✅ Use PNG (SVG often blocked)
  const logoUrl = `${appUrl}/swtax-favicon-pack/android-chrome-192x192.png`;

  const subject = "Your SW Tax Service portal access";
  const greeting = opts.firstName ? `Hi ${opts.firstName},` : "Hi,";

  const html = `
  <div style="background:#f6f7fb; padding:32px 12px;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      Your secure client portal access + temporary password.
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
            <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:18px; font-weight:800; color:#111827;">
              Secure Client Portal Access
            </div>
          </div>
        </div>

        <div style="padding:22px;">
          <p style="margin:0 0 10px 0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:15px; color:#111827;">
            ${greeting}
          </p>

          <p style="margin:0 0 14px 0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:14px; color:#374151; line-height:1.6;">
            You’ve been given access to your <strong>secure client portal</strong>.
            Use the temporary password below to sign in.
          </p>

          <p style="margin:0 0 14px 0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:13px; color:#374151; line-height:1.6;">
            After signing in, you’ll be prompted to <strong>create your own password</strong>.
          </p>

          <div style="margin:16px 0 8px 0; padding:12px 14px; border-radius:14px; border:1px solid #eef0f6; background:#fbfbfd;">
            <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:12px; color:#6b7280; margin-bottom:6px;">
              Temporary password
            </div>
            <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; font-size:14px; color:#111827; font-weight:800;">
              ${opts.tempPassword}
            </div>
          </div>

          <div style="margin:18px 0 14px 0;">
            <a href="${signInUrl}"
               style="display:inline-block; background:#E00040; color:#ffffff; text-decoration:none; padding:12px 16px; border-radius:12px; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:14px; font-weight:800;">
              Sign in &amp; Set New Password
            </a>
          </div>

          <p style="margin:0 0 6px 0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:12px; color:#6b7280;">
            Button not working? Copy and paste this link:
          </p>

          <p style="margin:0; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; font-size:12px; color:#111827; word-break:break-all;">
            ${signInUrl}
          </p>
        </div>

        <div style="padding:16px 22px; background:#fbfbfd; border-top:1px solid #eef0f6;">
          <p style="margin:0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:12px; color:#6b7280; line-height:1.6;">
            If you didn’t request this access, you can safely ignore this email.
          </p>
        </div>
      </div>

      <p style="margin:14px 6px 0; font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; font-size:11px; color:#9ca3af; text-align:center;">
        © ${new Date().getFullYear()} SW Tax Service
      </p>
    </div>
  </div>
  `;

  return { subject, html, signInUrl };
}

export async function sendTempPasswordInviteEmail(opts: {
  to: string;
  firstName?: string;
  appUrl?: string;
  tempPassword: string;
  next?: string;
}) {
  const appUrl = (opts.appUrl ?? process.env.APP_URL ?? "").replace(/\/$/, "");
  if (!appUrl) throw new Error("Missing APP_URL");

  const { subject, html } = buildTempPasswordInviteEmail({
    to: opts.to,
    firstName: opts.firstName,
    appUrl,
    tempPassword: opts.tempPassword,
    next: opts.next,
  });

  const from =
    process.env.RESEND_FROM ??
    process.env.RESEND_FROM_EMAIL ??
    "SW Tax Service <no-reply@swtaxservice.com>";

  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject,
    html,
  });

  if (error) throw new Error(error.message);
  return data;
}
