// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/page.tsx
import { db } from "@/drizzle/db";
import {
  emailCampaigns,
  emailRecipients,
  emailSubscribers,
  emailLists,
  appointmentAudienceSegment,
} from "@/drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import ConfirmActionButton from "./_components/ConfirmActionButton";
import CampaignHeader from "./_components/campaign-header";
import AudienceSection from "./_components/audience-section";
import ScheduleSection from "./_components/schedule-section";
import KpiGrid from "./_components/kpi-grid";
import RecipientsSection from "./_components/recipients-section";
import PreviewSection from "./_components/preview-section";
import { retryFailed } from "./actions/retry-actions";
import { resendWholeCampaignAsCopy } from "./actions/resend-actions";
import {
  sendNowDirectResend,
  scheduleDirectResend,
} from "./actions/send-actions";

// ✅ NEW imports for preview rendering
import { EMAIL_DEFAULTS } from "@/lib/constants/email-defaults";
import { renderString } from "@/lib/helpers/render-template";
import { buildEmailFooterHTML, buildEmailFooterText } from "@/lib/email/footer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { campaignId: string } | Promise<{ campaignId: string }>;
};

export default async function CampaignDetailPage({ params }: PageProps) {
  // ✅ Next.js 15 fix (params can be async)
  const { campaignId } = await Promise.resolve(params);

  const [campaign] = await db
    .select({
      id: emailCampaigns.id,
      name: emailCampaigns.name,
      subject: emailCampaigns.subject,
      htmlBody: emailCampaigns.htmlBody,
      textBody: emailCampaigns.textBody,

      segment: emailCampaigns.segment,
      listId: emailCampaigns.listId,
      apptSegment: emailCampaigns.apptSegment,
      manualRecipientsRaw: emailCampaigns.manualRecipientsRaw,

      status: emailCampaigns.status,
      scheduledAt: emailCampaigns.scheduledAt,
      schedulerName: emailCampaigns.schedulerName,

      createdAt: emailCampaigns.createdAt,
      sentAt: emailCampaigns.sentAt,
    })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-[#202030]">
          Campaign not found
        </h1>
        <a
          className="text-sm font-semibold hover:underline"
          href="/admin/email/campaigns"
        >
          Back to Campaigns →
        </a>
      </div>
    );
  }

  // ✅ Lists dropdown
  const lists = await db
    .select({
      id: emailLists.id,
      name: (emailLists as any).name,
      createdAt: emailLists.createdAt,
    })
    .from(emailLists)
    .orderBy(desc(emailLists.createdAt))
    .limit(200);

  // ✅ KPI counts
    // ✅ KPI counts (recipient statuses only)
 const [counts] = await db
  .select({
    queued: sql<number>`coalesce(sum(case when ${emailRecipients.status} = 'queued' then 1 else 0 end),0)::int`,
    sent: sql<number>`coalesce(sum(case when ${emailRecipients.status} = 'sent' then 1 else 0 end),0)::int`,
    failed: sql<number>`coalesce(sum(case when ${emailRecipients.status} = 'failed' then 1 else 0 end),0)::int`,
    unsubscribed: sql<number>`coalesce(sum(case when ${emailRecipients.status} = 'unsubscribed' then 1 else 0 end),0)::int`,
    total: sql<number>`count(*)::int`,
  })
  .from(emailRecipients)
  .where(eq(emailRecipients.campaignId, campaign.id));



    const kpi = {
  queued: counts?.queued ?? 0,
  sent: counts?.sent ?? 0,
  failed: counts?.failed ?? 0,
  unsubscribed: counts?.unsubscribed ?? 0,
  total: counts?.total ?? 0,
};



  const recentRecipients = await db
    .select({
      id: emailRecipients.id,
      email: emailRecipients.email,
      status: emailRecipients.status,
      error: (emailRecipients as any).error,
      sentAt: (emailRecipients as any).sentAt,
      createdAt: emailRecipients.createdAt,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.campaignId, campaign.id))
    .orderBy(desc(emailRecipients.createdAt))
    .limit(25);

  const subscribers = await db
    .select({
      id: emailSubscribers.id,
      email: (emailSubscribers as any).email,
      fullName: (emailSubscribers as any).fullName,
      tags: (emailSubscribers as any).tags,
      status: (emailSubscribers as any).status,
      createdAt: emailSubscribers.createdAt,
    })
    .from(emailSubscribers)
    .orderBy(desc(emailSubscribers.createdAt))
    .limit(500);

  const existingRecipientRows = await db
    .select({ email: emailRecipients.email })
    .from(emailRecipients)
    .where(eq(emailRecipients.campaignId, campaign.id));

  const existingEmails = existingRecipientRows
    .map((r) =>
      String(r.email ?? "")
        .toLowerCase()
        .trim()
    )
    .filter(Boolean);

  // ✅ Bind server actions (so ConfirmActionButton works clean)
  async function retryFailedAction() {
    "use server";
    await retryFailed(campaign.id);
  }

  // ✅ Send actions (two different paths)
  async function resendCopyAction() {
    "use server";
    await resendWholeCampaignAsCopy(campaign.id);
  }

  async function sendDirectResendAction() {
    "use server";
    await sendNowDirectResend(campaign.id);
  }

  async function scheduleDirectResendAction(formData: FormData) {
  "use server";

  const local = String(formData.get("sendAtIso") ?? "").trim(); // e.g. 2026-01-22T09:00
  if (!local) throw new Error("Pick a date/time.");

  // Treat the input as Los Angeles time, then convert to UTC ISO for Resend
  const sendAtUtcIso = DateTime
    .fromFormat(local, "yyyy-MM-dd'T'HH:mm", { zone: "America/Los_Angeles" })
    .toUTC()
    .toISO();

  if (!sendAtUtcIso) throw new Error("Invalid date/time.");

  await scheduleDirectResend(campaign.id, sendAtUtcIso);
}

  /* =========================
     ✅ PREVIEW RENDER (server)
     ========================= */

  const previewVars: any = {
    ...EMAIL_DEFAULTS,
    // preview-only personalization
    first_name: "there",
    unsubscribe_link: "https://www.swtaxservice.com/unsubscribe",
  };

  previewVars.footer_html = buildEmailFooterHTML("marketing", {
    companyName: String(previewVars.company_name ?? ""),
    supportEmail: String(previewVars.support_email ?? ""),
    website: String(previewVars.website ?? ""),
    addressLine: "Las Vegas, NV",
    unsubUrl: previewVars.unsubscribe_link,
    includeDivider: false, // template already has <hr>
    includeUnsubscribe: false, // template renders unsubscribe separately
  });

  previewVars.footer_text = buildEmailFooterText("marketing", {
    companyName: String(previewVars.company_name ?? ""),
    supportEmail: String(previewVars.support_email ?? ""),
    website: String(previewVars.website ?? ""),
    addressLine: "Las Vegas, NV",
    unsubUrl: previewVars.unsubscribe_link,
  });

  const renderedPreviewHtml = renderString(
    String(campaign.htmlBody ?? ""),
    previewVars
  );

  return (
    <div className="space-y-8">
      {/* Header only displays info now (no built-in send button) */}
      <CampaignHeader campaign={campaign as any} />

      {/* ✅ Send / Schedule / Retry / Resend controls */}
      <div className="flex flex-wrap items-center gap-2">
        <form action={sendDirectResendAction}>
          <input type="hidden" name="campaignId" value={campaign.id} />
          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send Now (Direct Resend)
          </button>
        </form>

        <form
          action={scheduleDirectResendAction}
          className="flex items-center gap-2"
        >
          <input
            name="sendAtIso"
            type="datetime-local"
            className="rounded-xl border px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Schedule (Direct Resend)
          </button>
        </form>

        <ConfirmActionButton
          action={retryFailedAction}
          confirmText="Retry FAILED recipients for this campaign? (Only failed emails will be re-queued)"
          className="cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
        >
          Retry Failed
        </ConfirmActionButton>

        <ConfirmActionButton
          action={resendCopyAction}
          confirmText="Resend this campaign to everyone again? This will create a NEW campaign copy and queue recipients."
          className="cursor-pointer rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Resend (New Copy)
        </ConfirmActionButton>
      </div>

      <AudienceSection
        campaign={campaign as any}
        lists={lists as any}
        appointmentAudienceValues={appointmentAudienceSegment.enumValues}
      />

      <ScheduleSection campaign={campaign as any} />

      <KpiGrid kpi={kpi} />

      <RecipientsSection
        campaignId={campaign.id}
        subscribers={subscribers as any}
        existingEmails={existingEmails}
        recentRecipients={recentRecipients as any}
      />

      {/* ✅ Rendered preview (no raw {{footer_text}} tokens) */}
      <PreviewSection html={renderedPreviewHtml} />
    </div>
  );
}
