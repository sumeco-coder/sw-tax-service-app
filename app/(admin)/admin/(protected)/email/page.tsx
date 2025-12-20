// app/(admin)/admin/(protected)/email/page.tsx
import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { desc } from "drizzle-orm";
import { createAndSendCampaignAction } from "./actions";
import { ALL_TEMPLATES } from "./templates/_templates";
import SendCampaignForm from "./_components/send-campaign-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEmailPage() {
  const campaigns = await db
    .select()
    .from(emailCampaigns)
    .orderBy(desc(emailCampaigns.createdAt))
    .limit(20);

  // Keep templates server-side and pass down (safe + no FS reads)
  const templates = ALL_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    subject: t.subject,
    html: t.html,
    text: t.text,
  }));

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

        <SendCampaignForm
          templates={templates}
          action={createAndSendCampaignAction}
        />
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
