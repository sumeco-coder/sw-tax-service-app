// amplify/functions/emailCampaignRunner/handler.ts
import crypto from "crypto";
import { Resend } from "resend";
import pg from "pg";

const { Pool } = pg;

const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL ?? "SW Tax Service <no-reply@swtaxservice.com>";

/** --------------------------
 *  ENV + URL helpers
 *  -------------------------- */

function normalizeBaseUrl(raw: unknown) {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  s = s.replace(/\/+$/, "");
  return s;
}

/**
 * ✅ Prefer APP_ORIGIN / APP_URL for app links.
 * SITE_URL is a fallback (often marketing).
 */
function getBaseUrl() {
  return (
    normalizeBaseUrl(process.env.APP_ORIGIN) ||
    normalizeBaseUrl(process.env.APP_URL) ||
    normalizeBaseUrl(process.env.SITE_URL) ||
    "https://www.swtaxservice.com"
  );
}

const DEFAULTS = {
  company_name: process.env.COMPANY_NAME ?? "SW Tax Service",
  support_email: process.env.SUPPORT_EMAIL ?? "support@swtaxservice.com",
  website: process.env.SITE_URL ?? "https://www.swtaxservice.com",
  address_line: process.env.COMPANY_ADDRESS ?? "Las Vegas, NV",
  signature_name: process.env.SIGNATURE_NAME ?? "SW Tax Service Team",
};

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  return new Resend(key);
}

function makeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

/**
 * If someone accidentally saved a secret like:
 *   DATABASE_URL="postgresql://..."
 * this cleans it to just the URL.
 */
function sanitizeDbUrl(raw: string) {
  let v = String(raw ?? "").trim();

  if (/^DATABASE_URL\s*=/i.test(v)) {
    v = v.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
  }

  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }

  return v;
}

function safeLogDbHost(dbUrl: string) {
  try {
    const u = new URL(dbUrl);
    console.log("DB_HOST =", u.hostname);
    console.log("DB_NAME =", u.pathname?.replace("/", "") || "");
  } catch {
    console.log("DB_HOST_PARSE_FAILED");
  }
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getVar(vars: Record<string, any>, key: string) {
  const parts = key.split(".");
  let cur: any = vars;
  for (const p of parts) {
    if (cur == null) return "";
    cur = cur[p];
  }
  return cur ?? "";
}

/**
 * Minimal handlebars-like renderer:
 * - {{var}} => HTML-escaped
 * - {{{var}}} => raw
 * - {{#if var}} ... {{else}} ... {{/if}} => conditional include (supports else)
 */
function renderTpl(source: string, vars: Record<string, any>) {
  let out = String(source ?? "");

  // if/else
  out = out.replace(
    /{{#if\s+([\w.]+)\s*}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g,
    (_m, key, truthyBlock, falsyBlock) =>
      getVar(vars, key) ? truthyBlock : (falsyBlock ?? "")
  );

  // raw triple-stash
  out = out.replace(/{{{\s*([\w.]+)\s*}}}/g, (_m, key) =>
    String(getVar(vars, key) ?? "")
  );

  // normal
  out = out.replace(/{{\s*([\w.]+)\s*}}/g, (_m, key) =>
    escapeHtml(String(getVar(vars, key) ?? ""))
  );

  return out;
}

function firstNameFromFullName(fullName?: string | null) {
  const s = String(fullName ?? "").trim();
  if (!s) return "there";
  return s.split(/\s+/)[0] || "there";
}

function buildFooterHtml() {
  return `
<div style="font-size:12px;color:#9CA3AF;line-height:18px;margin-top:14px;">
  <div><strong>${escapeHtml(DEFAULTS.company_name)}</strong></div>
  <div>${escapeHtml(DEFAULTS.address_line)}</div>
  <div><a href="mailto:${escapeHtml(DEFAULTS.support_email)}" style="color:#FCA5A5;text-decoration:underline;font-weight:700;">${escapeHtml(
    DEFAULTS.support_email
  )}</a></div>
  <div><a href="${escapeHtml(DEFAULTS.website)}" style="color:#FCA5A5;text-decoration:underline;font-weight:700;">${escapeHtml(
    DEFAULTS.website
  )}</a></div>
</div>
  `.trim();
}

function buildFooterText() {
  return `
${DEFAULTS.company_name}
${DEFAULTS.address_line}
${DEFAULTS.support_email}
${DEFAULTS.website}
  `.trim();
}

/**
 * Returns true if template needs an invite-based link.
 * ✅ includes both naming styles
 */
function needsInvite(source: string) {
  const s = String(source ?? "");
  return /{{\s*(invite_link|sign_in_link|portal_link|invite_token|invite_code|sign_in_url|sign_up_url|onboarding_sign_up_url)\s*}}/i.test(
    s
  );
}

function formatInviteExpiry(expiresAt: Date | null) {
  if (!expiresAt) return { invite_expires_at: "", expires_text: "" };

  const readable = expiresAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    invite_expires_at: readable, // older mjml template placeholder
    expires_text: `Link expires: ${readable}`, // newer template placeholder
  };
}

/** --------------------------
 *  DB helpers
 *  -------------------------- */

async function ensureTaxpayerInvite(
  pool: pg.Pool,
  email: string
): Promise<{ token: string; expiresAt: Date | null }> {
  const existing = await pool.query(
    `
    select token, expires_at as "expiresAt"
    from invites
    where lower(email)=lower($1)
      and type='taxpayer'
      and status='pending'
      and (expires_at is null or expires_at > now())
    order by created_at desc
    limit 1
    `,
    [email]
  );

  if (existing.rows?.[0]?.token) {
    return {
      token: String(existing.rows[0].token),
      expiresAt: existing.rows[0].expiresAt
        ? new Date(existing.rows[0].expiresAt)
        : null,
    };
  }

  const token = makeToken();

  const daysRaw = process.env.INVITE_EXPIRES_DAYS ?? "14";
  const days = Number(daysRaw);
  const expiresDays = Number.isFinite(days) ? days : 14;

  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);

  await pool.query(
    `
    insert into invites (email, token, type, status, expires_at, meta, created_at, updated_at)
    values ($1, $2, 'taxpayer', 'pending', now() + ($3 || ' days')::interval, $4::jsonb, now(), now())
    `,
    [
      email,
      token,
      String(expiresDays),
      JSON.stringify({ source: "emailCampaignRunner" }),
    ]
  );

  return { token, expiresAt };
}

async function lookupFullName(pool: pg.Pool, email: string) {
  const w = await pool.query(
    `select full_name as "fullName" from waitlist where lower(email)=lower($1) limit 1`,
    [email]
  );
  if (w.rows?.[0]?.fullName) return String(w.rows[0].fullName);

  const s = await pool.query(
    `select full_name as "fullName" from email_subscribers where lower(email)=lower($1) limit 1`,
    [email]
  );
  if (s.rows?.[0]?.fullName) return String(s.rows[0].fullName);

  const u = await pool.query(
    `select name as "fullName" from users where lower(email)=lower($1) limit 1`,
    [email]
  );
  if (u.rows?.[0]?.fullName) return String(u.rows[0].fullName);

  return null;
}

/**
 * IMPORTANT:
 * We DO NOT pass `connectionString` into Pool, because query params like
 * `sslmode=verify-full` can cause TLS verification behavior you don’t want.
 * We parse it ourselves and always force ssl rejectUnauthorized=false.
 */
function poolFromDatabaseUrl(dbUrl: string) {
  const u = new URL(dbUrl);

  const user = decodeURIComponent(u.username || "");
  const password = decodeURIComponent(u.password || "");
  const host = u.hostname;
  const port = u.port ? Number(u.port) : 5432;
  const database = (u.pathname || "").replace(/^\//, "");

  if (!host) throw new Error("DATABASE_URL missing host");
  if (!database) throw new Error("DATABASE_URL missing database name");
  if (!user) throw new Error("DATABASE_URL missing user");
  if (!password) throw new Error("DATABASE_URL missing password");

  return new Pool({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false }, // ✅ keeps your SSL errors away
  });
}

/** --------------------------
 *  Runner
 *  -------------------------- */

export const handler = async () => {
  const rawDbUrl = process.env.DATABASE_URL;
  if (!rawDbUrl) throw new Error("DATABASE_URL missing");

  const dbUrl = sanitizeDbUrl(rawDbUrl);
  safeLogDbHost(dbUrl);

  const BATCH_SIZE = Math.max(
    1,
    Math.min(200, Number(process.env.EMAIL_SEND_BATCH_SIZE ?? "50"))
  );

  const MAX_MS = Math.max(
    10_000,
    Math.min(
      30 * 60 * 1000,
      Number(process.env.EMAIL_RUNNER_MAX_MS ?? String(10 * 60 * 1000))
    )
  );

  const started = Date.now();
  const pool = poolFromDatabaseUrl(dbUrl);

  const LOCK_KEY = 987654321;
  const lock = await pool.query("select pg_try_advisory_lock($1) as ok", [
    LOCK_KEY,
  ]);
  if (!lock.rows?.[0]?.ok) {
    await pool.end();
    return { ok: true, message: "Runner already active (lock held)" };
  }

  try {
    // move scheduled -> sending
    await pool.query(`
      update email_campaigns
      set status='sending', updated_at=now()
      where status='scheduled'
        and scheduled_at is not null
        and scheduled_at <= now()
    `);

    const campaignRes = await pool.query(
      `
      select id, subject, html_body, text_body
      from email_campaigns
      where status = 'sending'
      order by updated_at asc
      limit 1
      `
    );

    const campaign = campaignRes.rows[0];
    if (!campaign) return { ok: true, message: "No campaigns sending" };

    const recRes = await pool.query(
      `
      select id, email, unsub_token
      from email_recipients
      where campaign_id = $1 and status = 'queued'
      order by created_at asc
      limit $2
      `,
      [campaign.id, BATCH_SIZE]
    );

    if (recRes.rows.length === 0) {
      await pool.query(
        `
        update email_campaigns
        set status='sent', sent_at=now(), updated_at=now()
        where id=$1
        `,
        [campaign.id]
      );
      return { ok: true, message: "Campaign completed (no queued left)" };
    }

    const resend = resendClient();
    const base = getBaseUrl(); // ✅ app-first base

    const campaignHtml = String(campaign.html_body ?? "");
    const campaignText = String(campaign.text_body ?? "");
    const campaignSubject = String(campaign.subject ?? "");

    const inviteRequired =
      needsInvite(campaignHtml) ||
      needsInvite(campaignText) ||
      needsInvite(campaignSubject);

    let sent = 0;

    for (const r of recRes.rows) {
      if (Date.now() - started > MAX_MS) break;

      const email = String(r.email).toLowerCase().trim();
      if (!email) continue;

      // skip unsubscribed
      const unsub = await pool.query(
        `select 1 from email_unsubscribes where email=$1 limit 1`,
        [email]
      );

      if ((unsub.rowCount ?? 0) > 0) {
        await pool.query(
          `update email_recipients
           set status='unsubscribed', updated_at=now(), error='Skipped (unsubscribed)'
           where id=$1`,
          [r.id]
        );
        continue;
      }

      const fullName = await lookupFullName(pool, email);
      const first_name = firstNameFromFullName(fullName);

      const unsubUrl = `${base}/unsubscribe?token=${encodeURIComponent(
        String(r.unsub_token ?? "")
      )}`;

      // ✅ ensure invite token if template needs it
      let inviteToken = "";
      let inviteExpiresAt: Date | null = null;

      if (inviteRequired) {
        const ensured = await ensureTaxpayerInvite(pool, email);
        inviteToken = ensured.token;
        inviteExpiresAt = ensured.expiresAt;
      }

      // ✅ where user should land AFTER onboarding is complete
      const AFTER_ONBOARDING_NEXT = "/dashboard";

      // ✅ Create-account (invite signup) link
      const onboardingSignUpUrl = inviteToken
        ? `${base}/taxpayer/onboarding-sign-up?invite=${encodeURIComponent(
            inviteToken
          )}&next=${encodeURIComponent(AFTER_ONBOARDING_NEXT)}`
        : `${base}/sign-up`;

      // ✅ Smart invite validator (optional “prefer link” / safety link)
      const inviteConsumeUrl = inviteToken
        ? `${base}/invite/consume?token=${encodeURIComponent(inviteToken)}&next=${encodeURIComponent(
            AFTER_ONBOARDING_NEXT
          )}`
        : `${base}/sign-in`;

      // ✅ Sign-in link (keeps invite context)
      const signInUrl = inviteToken
        ? `${base}/sign-in?invite=${encodeURIComponent(inviteToken)}&next=${encodeURIComponent(
            AFTER_ONBOARDING_NEXT
          )}`
        : `${base}/sign-in`;

      const expiryVars = formatInviteExpiry(inviteExpiresAt);

      const vars: Record<string, any> = {
        ...DEFAULTS,
        email,
        first_name,

        waitlist_link: `${base}/waitlist`,

        // ✅ legacy tokens (keep for backwards compatibility)
        invite_token: inviteToken,
        invite_code: inviteToken,

        // ✅ create account
        invite_link: onboardingSignUpUrl,
        sign_up_url: onboardingSignUpUrl,
        onboarding_sign_up_url: onboardingSignUpUrl,

        // ✅ sign in
        sign_in_url: signInUrl,
        sign_in_link: signInUrl,

        // ✅ “smart/validated” link
        portal_link: inviteConsumeUrl,

        ...expiryVars,

        unsubscribe_link: unsubUrl,
        footer_html: buildFooterHtml(),
        footer_text: buildFooterText(),

        logo_url: `${base}/swtax-favicon-pack/android-chrome-512x512.png`,
        logo_alt: DEFAULTS.company_name,
        logo_link: base,
        logo_width: 72,
      };

      const subject = renderTpl(campaignSubject, vars);
      let htmlBody = renderTpl(campaignHtml, vars);
      let textBody = campaignText ? renderTpl(campaignText, vars) : "";

      // Safety: ensure unsub exists (some templates already include it)
      if (!/unsubscribe/i.test(htmlBody)) {
        htmlBody += `
<hr />
<p style="font-size:12px;color:#666">
  <a href="${unsubUrl}">Unsubscribe</a>
</p>`.trim();
      }
      if (textBody && !/unsubscribe/i.test(textBody)) {
        textBody += `\n\nUnsubscribe: ${unsubUrl}\n`;
      }

      try {
        await resend.emails.send({
          from: RESEND_FROM,
          to: email,
          subject,
          html: htmlBody,
          text: textBody || undefined,
        } as any);

        await pool.query(
          `update email_recipients
           set status='sent', sent_at=now(), updated_at=now(), error=null
           where id=$1`,
          [r.id]
        );

        sent++;
      } catch (e: any) {
        await pool.query(
          `update email_recipients
           set status='failed', updated_at=now(), error=$2
           where id=$1`,
          [r.id, String(e?.message ?? e)]
        );
      }
    }

    return { ok: true, sentBatch: sent };
  } finally {
    try {
      await pool.query("select pg_advisory_unlock($1)", [LOCK_KEY]);
    } catch {}
    await pool.end();
  }
};
