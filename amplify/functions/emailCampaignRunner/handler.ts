// amplify/functions/emailCampaignRunner/handler.ts
import { Resend } from "resend";
import pg from "pg";

const { Pool } = pg;

const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL ?? "SW Tax Service <no-reply@swtaxservice.com>";

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  return new Resend(key);
}

export const handler = async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL missing");

  const pool = new Pool({ connectionString: dbUrl });

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
       limit 50`,
      [campaign.id]
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

    const resend = resendClient();
    const siteUrl = process.env.SITE_URL ?? "https://www.swtaxservice.com";

    for (const r of recRes.rows) {
      const email = String(r.email).toLowerCase().trim();

      const unsub = await pool.query(
        `select 1 from email_unsubscribes where email=$1 limit 1`,
        [email]
      );

      if ((unsub.rowCount ?? 0) > 0) {
        await pool.query(
          `update email_recipients set status='unsubscribed', updated_at=now() where id=$1`,
          [r.id]
        );
        continue;
      }

      const unsubUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(
        r.unsub_token
      )}`;

      const html = `${campaign.html_body}
<hr />
<p style="font-size:12px;color:#666">
  <a href="${unsubUrl}">Unsubscribe</a>
</p>`;

      try {
        await resend.emails.send({
          from: RESEND_FROM,
          to: email,
          subject: campaign.subject,
          html,
          text: campaign.text_body ?? undefined,
        } as any);

        await pool.query(
          `update email_recipients set status='sent', sent_at=now(), updated_at=now(), error=null where id=$1`,
          [r.id]
        );
      } catch (e: any) {
        await pool.query(
          `update email_recipients set status='failed', updated_at=now(), error=$2 where id=$1`,
          [r.id, String(e?.message ?? e)]
        );
      }
    }

    return { ok: true, sentBatch: recRes.rows.length };
  } finally {
    await pool.end();
  }
};
