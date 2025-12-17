import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { desc } from "drizzle-orm";
import { createAndSendCampaignAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEmailPage() {
  const campaigns = await db
    .select()
    .from(emailCampaigns)
    .orderBy(desc(emailCampaigns.createdAt))
    .limit(20);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
        <p className="text-sm text-gray-600">
          Send broadcasts to waitlist segments using <code>sendEmail</code>.
        </p>
      </header>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Send a campaign</h2>

        <form action={createAndSendCampaignAction} className="mt-4 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-gray-600">
              Campaign name
              <input
                name="name"
                className="rounded-lg border px-3 py-2 text-sm"
                placeholder="Waitlist Open Announcement"
              />
            </label>

            <label className="grid gap-1 text-xs text-gray-600">
              Segment
              <select name="segment" className="rounded-lg border px-3 py-2 text-sm">
                <option value="waitlist_pending">Waitlist: Pending</option>
                <option value="waitlist_approved">Waitlist: Approved</option>
                <option value="waitlist_all">Waitlist: All</option>
              </select>
            </label>
          </div>

          <label className="grid gap-1 text-xs text-gray-600">
            Limit (avoid timeouts)
            <input name="limit" defaultValue={200} className="rounded-lg border px-3 py-2 text-sm" />
          </label>

          <label className="grid gap-1 text-xs text-gray-600">
            Subject
            <input name="subject" required className="rounded-lg border px-3 py-2 text-sm" />
          </label>

          <label className="grid gap-1 text-xs text-gray-600">
            HTML Body
            <textarea name="htmlBody" required rows={8} className="rounded-lg border px-3 py-2 text-sm font-mono" />
          </label>

          <label className="grid gap-1 text-xs text-gray-600">
            Text Body
            <textarea name="textBody" required rows={6} className="rounded-lg border px-3 py-2 text-sm font-mono" />
          </label>

          <button className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black">
            Send campaign
          </button>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Recent campaigns</h2>

        <div className="mt-3 overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-700">{c.segment}</td>
                  <td className="px-4 py-3 text-gray-700">{c.status}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(c.createdAt as any).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.sentAt ? new Date(c.sentAt as any).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}

              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No campaigns yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
