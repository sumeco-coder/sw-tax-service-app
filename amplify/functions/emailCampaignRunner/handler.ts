// amplify/functions/emailCampaignRunner/handler.ts
import { Resend } from "resend";
import pg from "pg";
import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";

const { Pool } = pg;

// ✅ Default sender (Resend verified domain/address required)
const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL ?? "SW Tax Service <no-reply@swtaxservice.com>";

// ✅ Batch settings
const BATCH_SIZE = Number(process.env.EMAIL_SEND_BATCH_SIZE ?? 50);

// ✅ Safety (don’t run forever)
const MAX_MS = Number(process.env.EMAIL_RUNNER_MAX_MS ?? 10 * 60 * 1000); // 10 min
const CONTINUATION_IN_MS = Number(process.env.EMAIL_CONTINUATION_DELAY_MS ?? 60_000); // 1 min

// ✅ If a Lambda crashes mid-batch, recipients can be left in "sending".
// This resets them back to "queued" if they are stale (older than X minutes).
const STALE_SENDING_MINUTES = Number(process.env.EMAIL_STALE_SENDING_MINUTES ?? 30);

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  return new Resend(key);
}

function schedulerClient() {
  // In Lambda, AWS_REGION is always set (use that)
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) throw new Error("AWS_REGION is not set");
  return new SchedulerClient({ region });
}

function toAtExpression(d: Date) {
  // Scheduler "at()" wants: at(YYYY-MM-DDTHH:MM:SS) (no milliseconds)
  const isoNoMs = d.toISOString().slice(0, 19);
  return `at(${isoNoMs})`;
}

async function scheduleContinuation(campaignId: string, runAt: Date) {
  const lambdaArn = process.env.EMAIL_CAMPAIGN_RUNNER_LAMBDA_ARN;
  const roleArn = process.env.SCHEDULER_INVOKE_ROLE_ARN;

  if (!lambdaArn || !roleArn) {
    throw new Error(
      "Missing EMAIL_CAMPAIGN_RUNNER_LAMBDA_ARN or SCHEDULER_INVOKE_ROLE_ARN"
    );
  }

  // Keep schedule name <= 64 chars (safe)
  const short = String(campaignId).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 8);
  const name = `camp-${short}-cont-${Date.now()}`;

  const scheduler = schedulerClient();
  await scheduler.send(
    new CreateScheduleCommand({
      Name: name,
      GroupName: "default",
      FlexibleTimeWindow: { Mode: "OFF" },
      ScheduleExpression: toAtExpression(runAt),
      ScheduleExpressionTimezone: "UTC",
      ActionAfterCompletion: "DELETE", // ✅ auto cleanup
      Target: {
        Arn: lambdaArn,
        RoleArn: roleArn,
        Input: JSON.stringify({ campaignId }),
      },
    })
  );

  return name;
}

/**
 * IMPORTANT DB REQUIREMENTS (for this runner to be safe under concurrency)
 *
 * 1) email_campaigns.status enum includes: draft, scheduled, sending, sent, failed
 * 2) email_campaigns has columns: scheduled_at (timestamptz), scheduler_name (text, optional)
 * 3) email_recipients.status enum includes: queued, sending, sent, failed, unsubscribed
 *
 * If you don't add recipient status "sending", concurrency can cause duplicate sends.
 */

export const handler = async (event: any = {}) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL missing");

  const pool = new Pool({ connectionString: dbUrl });

  const started = Date.now();
  const requestedCampaignId =
    typeof event?.campaignId === "string" ? event.campaignId : undefined;

  try {
    // ✅ 0) Reset stale "sending" recipients back to queued (crash recovery)
    await pool.query(
      `update email_recipients
       set status = 'queued', updated_at = now(), error = coalesce(error,'') 
       where status = 'sending'
         and updated_at < (now() - ($1 || ' minutes')::interval)`,
      [String(STALE_SENDING_MINUTES)]
    );

    // ✅ 1) Promote any due scheduled campaigns -> sending
    await pool.query(
      `update email_campaigns
       set status = 'sending', updated_at = now()
       where status = 'scheduled'
         and scheduled_at is not null
         and scheduled_at <= now()`
    );

    // Loop until we hit time budget
    while (Date.now() - started < MAX_MS) {
      // ✅ 2) Get a campaign that is currently sending
      const campaignRes = requestedCampaignId
        ? await pool.query(
            `select id, subject, html_body, text_body
             from email_campaigns
             where id = $1 and status = 'sending'
             limit 1`,
            [requestedCampaignId]
          )
        : await pool.query(
            `select id, subject, html_body, text_body
             from email_campaigns
             where status = 'sending'
             order by updated_at asc
             limit 1`
          );

      const campaign = campaignRes.rows[0];
      if (!campaign) {
        return {
          ok: true,
          message: requestedCampaignId
            ? "Requested campaign is not sending."
            : "No campaigns sending",
        };
      }

      // ✅ 3) Claim next batch atomically (prevents duplicates across concurrent runners)
      const claimRes = await pool.query(
        `with cte as (
           select id
           from email_recipients
           where campaign_id = $1 and status = 'queued'
           order by created_at asc
           limit $2
           for update skip locked
         )
         update email_recipients r
         set status = 'sending', updated_at = now(), error = null
         from cte
         where r.id = cte.id
         returning r.id, r.email, r.unsub_token`,
        [campaign.id, BATCH_SIZE]
      );

      // ✅ If nothing left queued, finalize campaign
      if (claimRes.rows.length === 0) {
        await pool.query(
          `update email_campaigns
           set status = 'sent', sent_at = now(), updated_at = now()
           where id = $1`,
          [campaign.id]
        );

        if (requestedCampaignId) {
          return { ok: true, message: "Campaign completed" };
        }

        // otherwise, keep looping to see if another campaign is sending
        continue;
      }

      const resend = resendClient();
      const siteUrl = (process.env.SITE_URL ?? "https://www.swtaxservice.com").replace(
        /\/$/,
        ""
      );

      for (const r of claimRes.rows) {
        const email = String(r.email).toLowerCase().trim();
        if (!email) {
          await pool.query(
            `update email_recipients
             set status = 'failed', updated_at = now(), error = 'Missing email'
             where id = $1`,
            [r.id]
          );
          continue;
        }

        // unsubscribe check
        const unsub = await pool.query(
          `select 1 from email_unsubscribes where email = $1 limit 1`,
          [email]
        );

        if ((unsub.rowCount ?? 0) > 0) {
          await pool.query(
            `update email_recipients
             set status = 'unsubscribed', updated_at = now(), error = 'Skipped (unsubscribed)'
             where id = $1`,
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
            `update email_recipients
             set status = 'sent', sent_at = now(), updated_at = now(), error = null
             where id = $1`,
            [r.id]
          );
        } catch (e: any) {
          await pool.query(
            `update email_recipients
             set status = 'failed', updated_at = now(), error = $2
             where id = $1`,
            [r.id, String(e?.message ?? e)]
          );
        }
      }

      // ✅ 4) If we’re close to timeout, schedule continuation and exit
      if (Date.now() - started > MAX_MS - 60_000) {
        const runAt = new Date(Date.now() + CONTINUATION_IN_MS);
        const schedName = await scheduleContinuation(campaign.id, runAt);

        // Optional visibility (requires scheduler_name column)
        try {
          await pool.query(
            `update email_campaigns
             set scheduler_name = $2, updated_at = now()
             where id = $1`,
            [campaign.id, schedName]
          );
        } catch {
          // ignore if column doesn't exist yet
        }

        return {
          ok: true,
          message: "Scheduled continuation",
          scheduled: schedName,
        };
      }
    }

    return { ok: true, message: "Max runtime reached" };
  } finally {
    await pool.end();
  }
};
