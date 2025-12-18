import Link from "next/link";
import { db } from "@/drizzle/db";
import {
  emailCampaigns,
  emailRecipients,
  emailSubscribers,
} from "@/drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";
import RecipientPicker from "./recipient-picker";
import { autoAddBySegment } from "./queue-actions";
import { sendNow } from "./send-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "sent"
      ? { border: "#22c55e40", bg: "#22c55e14", text: "#166534" }
      : status === "sending"
      ? { border: "#3b82f640", bg: "#3b82f614", text: "#1d4ed8" }
      : status === "failed"
      ? { border: "#ef444440", bg: "#ef444414", text: "#991b1b" }
      : { border: "#a3a3a340", bg: "#00000008", text: "#202030" };

  return (
    <span
      className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderColor: styles.border,
        background: styles.bg,
        color: styles.text,
      }}
    >
      {status}
    </span>
  );
}

function SegmentLabel({ seg }: { seg: string }) {
  const label =
    seg === "waitlist_pending"
      ? "Waitlist: Pending"
      : seg === "waitlist_approved"
      ? "Waitlist: Approved"
      : seg === "waitlist_all"
      ? "Waitlist: All"
      : seg;

  return (
    <span className="rounded-full border bg-black/[0.02] px-2.5 py-1 text-xs font-semibold text-[#202030]/80">
      {label}
    </span>
  );
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [campaign] = await db
    .select({
      id: emailCampaigns.id,
      name: emailCampaigns.name,
      subject: emailCampaigns.subject,
      htmlBody: emailCampaigns.htmlBody,
      textBody: emailCampaigns.textBody,
      segment: emailCampaigns.segment,
      status: emailCampaigns.status,
      createdAt: emailCampaigns.createdAt,
      sentAt: emailCampaigns.sentAt,
    })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);

  if (!campaign) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-[#202030]">Campaign not found</h1>
        <Link className="text-sm font-semibold text-[#202030] hover:underline" href="/admin/email/campaigns">
          Back to Campaigns →
        </Link>
      </div>
    );
  }

  // KPI counts by status
  const [counts] = await db
    .select({
      queued: sql<number>`sum(case when ${emailRecipients.status} = 'queued' then 1 else 0 end)::int`,
      sent: sql<number>`sum(case when ${emailRecipients.status} = 'sent' then 1 else 0 end)::int`,
      failed: sql<number>`sum(case when ${emailRecipients.status} = 'failed' then 1 else 0 end)::int`,
      unsubscribed: sql<number>`sum(case when ${emailRecipients.status} = 'unsubscribed' then 1 else 0 end)::int`,
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

  // Recent recipients list
  const recentRecipients = await db
    .select({
      id: emailRecipients.id,
      email: emailRecipients.email,
      status: emailRecipients.status,
      error: emailRecipients.error,
      sentAt: emailRecipients.sentAt,
      createdAt: emailRecipients.createdAt,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.campaignId, campaign.id))
    .orderBy(desc(emailRecipients.createdAt))
    .limit(25);

  // Manual selection source list (email_subscribers)
  const subscribers = await db
    .select({
      id: emailSubscribers.id,
      email: emailSubscribers.email,
      fullName: emailSubscribers.fullName,
      tags: emailSubscribers.tags,
      status: emailSubscribers.status,
      createdAt: emailSubscribers.createdAt,
    })
    .from(emailSubscribers)
    .orderBy(desc(emailSubscribers.createdAt))
    .limit(500);

  async function autoAddAction() {
    "use server";
    await autoAddBySegment(campaign.id);
  }

  async function sendNowAction() {
    "use server";
    await sendNow(campaign.id);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/admin/email/campaigns"
            className="text-sm font-semibold text-[#202030] hover:underline"
          >
            ← Back to Campaigns
          </Link>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <h1 className="text-2xl font-bold text-[#202030]">{campaign.name}</h1>
            <StatusPill status={campaign.status} />
            <SegmentLabel seg={campaign.segment} />
          </div>

          <p className="text-sm text-[#202030]/70">
            <span className="font-semibold text-[#202030]">Subject:</span>{" "}
            {campaign.subject}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Auto-add by segment */}
          <form action={autoAddAction}>
            <button
              type="submit"
              className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
              title="Pull recipients from waitlist based on the campaign segment"
            >
              Auto-add by segment
            </button>
          </form>

          {/* Send now */}
          <form action={sendNowAction}>
            <button
              type="submit"
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
              title="Marks campaign as 'sending'. Your worker should process queued recipients."
            >
              Send now
            </button>
          </form>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Queued" value={kpi.queued} />
        <Kpi label="Sent" value={kpi.sent} />
        <Kpi label="Failed" value={kpi.failed} />
        <Kpi label="Unsubscribed" value={kpi.unsubscribed} />
        <Kpi label="Total" value={kpi.total} />
      </div>

      {/* Manual add */}
      <RecipientPicker campaignId={campaign.id} subscribers={subscribers} />

      {/* Recent recipients */}
      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#202030]">Recipients</h2>
            <p className="text-sm text-[#202030]/70">
              Latest queued/sent/failed recipients for this campaign.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border">
          <div className="grid grid-cols-12 bg-black/[0.02] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
            <div className="col-span-5">Email</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Sent</div>
            <div className="col-span-2">Error</div>
          </div>

          <div className="divide-y">
            {recentRecipients.map((r) => (
              <div key={r.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm">
                <div className="col-span-5 font-medium text-[#202030]">{r.email}</div>
                <div className="col-span-2">
                  <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                    {r.status}
                  </span>
                </div>
                <div className="col-span-3 text-xs text-[#202030]/70">
                  {r.sentAt
                    ? new Date(r.sentAt as any).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </div>
                <div className="col-span-2 text-xs text-[#202030]/60">
                  {r.error ? r.error.slice(0, 28) : "—"}
                </div>
              </div>
            ))}

            {recentRecipients.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#202030]/60">
                No recipients yet. Use “Auto-add by segment” or “Manual add”.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#202030]">Preview</h2>
        <p className="text-sm text-[#202030]/70">
          This is a raw preview of your HTML body (no sending happens here).
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border">
          <div
            className="prose max-w-none p-4"
            // You control the HTML; this is an admin-only view.
            dangerouslySetInnerHTML={{ __html: campaign.htmlBody }}
          />
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-[#202030]/70">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#202030]">{value}</p>
    </div>
  );
}
