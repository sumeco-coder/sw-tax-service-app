import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendPortalInviteEmail(opts: {
  to: string;
  firstName?: string;
  appUrl?: string;
}) {
  const appUrl = (opts.appUrl ?? process.env.APP_URL ?? "").replace(/\/$/, "");
  if (!appUrl) throw new Error("Missing APP_URL");

  const signInUrl = `${appUrl}/sign-in?email=${encodeURIComponent(opts.to)}`;

  const subject = "Your SW Tax Service portal access";
  const greeting = opts.firstName ? `Hi ${opts.firstName},` : "Hi,";

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; line-height:1.5; color:#111;">
    <div style="max-width:560px; margin:0 auto; padding:24px;">
      <div style="border-radius:16px; padding:20px; border:1px solid #eee;">
        <h2 style="margin:0 0 10px 0;">SW Tax Service Client Portal</h2>
        <p style="margin:0 0 12px 0;">${greeting}</p>
        <p style="margin:0 0 12px 0;">
          Your secure client portal is ready. Please set your password to sign in.
        </p>

        <ol style="margin:0 0 16px 18px; padding:0;">
          <li>Open the sign-in page</li>
          <li>Click <b>Forgot password</b></li>
          <li>Enter your email to receive a code</li>
          <li>Create your new password and sign in</li>
        </ol>

        <p style="margin:0 0 16px 0;">
          <a href="${signInUrl}"
             style="display:inline-block; padding:12px 16px; border-radius:12px; text-decoration:none; color:#fff; background:#E00040;">
            Go to Sign In
          </a>
        </p>

        <p style="margin:0; font-size:12px; color:#666;">
          If you didn’t request this, you can ignore this email.
        </p>
      </div>
    </div>
  </div>
  `;

  const from = process.env.RESEND_FROM!;
  if (!from) throw new Error("Missing RESEND_FROM");

  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject,
    html,
  });

  if (error) throw new Error(error.message);
  return data;
}
