// amplify/functions/emailCampaignRunner/handler.ts
import { Resend } from "resend";
import pg from "pg";

const { Pool } = pg;

function mustEnv(name: string) {
  const v = (process.env[name] ?? "").trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getSiteUrl() {
  const base =
    (process.env.SITE_URL ?? "").trim() ||
    (process.env.APP_URL ?? "").trim() ||
    (process.env.APP_ORIGIN ?? "").trim() ||
    "https://www.swtaxservice.com";

  return base.replace(/\/$/, "");
}

function getBatchSize() {
  const raw = (process.env.EMAIL_SEND_BATCH_SIZE ?? "50").trim();
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 50;
}

function getResend() {
  const key = mustEnv("RESEND_API_KEY");
  return new Resend(key);
}

export const handler = async () => {
  const DATABASE_URL = mustEnv("DATABASE_URL");
  const FROM =
    (process.env.RESEND_FROM_EMAIL ?? "").trim() ||
    "SW Tax Service <no-reply@swtaxservice.com>";

  const SITE_URL = getSiteUrl();
  const resend = getResend();
  const BATCH_SIZE = getBatchSize();

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const campaignRes = await pool.query(
      `select id, subject, html_body, text_body
       from email_campaigns
       where status = 'sending'
       order by updated_at asc
       limit 1`
    );

    const campaign = campaignRes.rows[0];
    if (!campaign) return { ok: true, message: "No campaigns sending" };

    const recRes = await pool.query(
      `select id, email, unsub_token
       from email_recipients
       where campaign_id = $1 and status = 'queued'
       order by created_at asc
       limit $2`,
      [campaign.id, BATCH_SIZE]
    );

    if (recRes.rows.length === 0) {
      await pool.query(
        `update email_campaigns
         set status='sent', sent_at=now(), updated_at=now()
         where id=$1`,
        [campaign.id]
      );
      return { ok: true, message: "Campaign completed" };
    }

    let sent = 0;
    let failed = 0;
    let skippedUnsub = 0;

    for (const r of recRes.rows) {
      const email = String(r.email ?? "").toLowerCase().trim();
      if (!email) continue;

      const unsub = await pool.query(
        `select 1 from email_unsubscribes where email=$1 limit 1`,
        [email]
      );

      if ((unsub.rowCount ?? 0) > 0) {
        skippedUnsub++;
        await pool.query(
          `update email_recipients
           set status='unsubscribed', updated_at=now()
           where id=$1`,
          [r.id]
        );
        continue;
      }

      const unsubUrl = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(
        String(r.unsub_token ?? "")
      )}`;

      const html = `${campaign.html_body}
<hr />
<p style="font-size:12px;color:#666">
  <a href="${unsubUrl}">Unsubscribe</a>
</p>`;

      try {
        const res: any = await resend.emails.send({
          from: FROM,
          to: email,
          subject: campaign.subject,
          html,
          text: campaign.text_body ?? undefined,
        });

        if (res?.error) {
          throw new Error(res.error?.message ?? "Resend send failed");
        }

        sent++;
        await pool.query(
          `update email_recipients
           set status='sent', sent_at=now(), updated_at=now(), error=null
           where id=$1`,
          [r.id]
        );
      } catch (e: any) {
        failed++;
        await pool.query(
          `update email_recipients
           set status='failed', updated_at=now(), error=$2
           where id=$1`,
          [r.id, String(e?.message ?? e)]
        );
      }
    }

    return {
      ok: true,
      campaignId: campaign.id,
      batchSize: recRes.rows.length,
      sent,
      failed,
      skippedUnsub,
    };
  } finally {
    await pool.end();
  }
};
