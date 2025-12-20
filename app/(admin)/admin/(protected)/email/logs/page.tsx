import Link from "next/link";
import { db } from "@/drizzle/db";
import { emailCampaigns, emailRecipients } from "@/drizzle/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import LogsFilters from "./_components/logs-filters";
import LogsTable from "./_components/logs-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmailLogsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const status = typeof searchParams?.status === "string" ? searchParams.status : "";
  const campaignId =
    typeof searchParams?.campaignId === "string" ? searchParams.campaignId : "";

  const where = and(
    q ? ilike(emailRecipients.email, `%${q}%`) : sql`true`,
    status ? sql`${emailRecipients.status} = ${status}` : sql`true`,
    campaignId ? eq(emailRecipients.campaignId, campaignId) : sql`true`
  );

  // KPIs (respect filters)
  const [kpi] = await db
    .select({
      queued: sql<number>`sum(case when ${emailRecipients.status} = 'queued' then 1 else 0 end)::int`,
      sent: sql<number>`sum(case when ${emailRecipients.status} = 'sent' then 1 else 0 end)::int`,
      failed: sql<number>`sum(case when ${emailRecipients.status} = 'failed' then 1 else 0 end)::int`,
      unsubscribed: sql<number>`sum(case when ${emailRecipients.status} = 'unsubscribed' then 1 else 0 end)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(emailRecipients)
    .where(where);

  // Campaign list for dropdown
  const campaigns = await db
    .select({ id: emailCampaigns.id, name: emailCampaigns.name })
    .from(emailCampaigns)
    .orderBy(desc(emailCampaigns.createdAt))
    .limit(200);

  // Rows
  const rows = await db
    .select({
      id: emailRecipients.id,
      email: emailRecipients.email,
      status: emailRecipients.status,
      error: emailRecipients.error,
      sentAt: emailRecipients.sentAt,
      createdAt: emailRecipients.createdAt,
      campaignId: emailRecipients.campaignId,
      campaignName: emailCampaigns.name,
    })
    .from(emailRecipients)
    .leftJoin(emailCampaigns, eq(emailCampaigns.id, emailRecipients.campaignId))
    .where(where)
    .orderBy(desc(emailRecipients.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#202030]">Email Logs</h1>
          <p className="text-sm text-[#202030]/70">
            Delivery history and errors across all campaigns.
          </p>
        </div>

        <Link
          href="/admin/email"
          className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
        >
          Back to Email →
        </Link>
      </div>

      {/* Filters */}
      <LogsFilters campaigns={campaigns} />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Queued" value={kpi?.queued ?? 0} />
        <Kpi label="Sent" value={kpi?.sent ?? 0} />
        <Kpi label="Failed" value={kpi?.failed ?? 0} />
        <Kpi label="Unsubscribed" value={kpi?.unsubscribed ?? 0} />
        <Kpi label="Total" value={kpi?.total ?? 0} />
      </div>

      {/* Table */}
      <LogsTable rows={rows as any} />
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
