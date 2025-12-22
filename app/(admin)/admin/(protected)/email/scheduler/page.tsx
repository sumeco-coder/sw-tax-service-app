// app/(admin)/admin/(protected)/email/scheduler/page.tsx
import Link from "next/link";
import { desc, and, isNotNull, isNull, gt } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmailSchedulerPage() {
  const now = new Date();

  const upcoming = await db
    .select({
      id: emailCampaigns.id,
      name: emailCampaigns.name,
      status: emailCampaigns.status,
      segment: emailCampaigns.segment,
      scheduledAt: emailCampaigns.scheduledAt,
      schedulerName: emailCampaigns.schedulerName,
      createdAt: emailCampaigns.createdAt,
      updatedAt: emailCampaigns.updatedAt,
    })
    .from(emailCampaigns)
    .where(and(isNotNull(emailCampaigns.scheduledAt), gt(emailCampaigns.scheduledAt, now)))
    .orderBy(desc(emailCampaigns.scheduledAt))
    .limit(50);

  const recentlySent = await db
    .select({
      id: emailCampaigns.id,
      name: emailCampaigns.name,
      status: emailCampaigns.status,
      segment: emailCampaigns.segment,
      sentAt: emailCampaigns.sentAt,
      schedulerName: emailCampaigns.schedulerName,
    })
    .from(emailCampaigns)
    .where(and(isNotNull(emailCampaigns.sentAt), isNull(emailCampaigns.scheduledAt)))
    .orderBy(desc(emailCampaigns.sentAt))
    .limit(25);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Email Scheduler</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View scheduled campaigns and recent sends.
          </p>
        </div>

        <Link
          href="/admin/email/campaigns"
          className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Go to Campaigns
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Upcoming scheduled</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Scheduler</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={5}>
                    No scheduled campaigns.
                  </td>
                </tr>
              ) : (
                upcoming.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/email/campaigns/${c.id}`}
                        className="font-semibold hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{String(c.segment)}</td>
                    <td className="px-4 py-3">{String(c.status)}</td>
                    <td className="px-4 py-3">
                      {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3">{c.schedulerName ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Recently sent</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Scheduler</th>
              </tr>
            </thead>
            <tbody>
              {recentlySent.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={5}>
                    No sent campaigns yet.
                  </td>
                </tr>
              ) : (
                recentlySent.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/email/campaigns/${c.id}`}
                        className="font-semibold hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{String(c.segment)}</td>
                    <td className="px-4 py-3">{String(c.status)}</td>
                    <td className="px-4 py-3">
                      {c.sentAt ? new Date(c.sentAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3">{c.schedulerName ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
