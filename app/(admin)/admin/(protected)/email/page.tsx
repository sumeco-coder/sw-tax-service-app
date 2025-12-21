// app/(admin)/admin/(protected)/email/page.tsx
import Link from "next/link";
import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { desc } from "drizzle-orm";

import { createAndSendCampaignAction } from "./actions";
import { ALL_TEMPLATES } from "./templates/_templates";
import SendCampaignForm from "./_components/send-campaign-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEmailPage() {
  // ✅ campaigns table
  const campaigns = await db
    .select()
    .from(emailCampaigns)
    .orderBy(desc(emailCampaigns.createdAt))
    .limit(20);

  // ✅ templates (always array)
  const templates = (ALL_TEMPLATES ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    subject: t.subject,
    html: (t.mjml ?? t.html ?? ""),
    text: t.text ?? "",
  }));

  /**
   * ✅ IMPORTANT:
   * You do NOT have an `email_lists` table in your DB right now.
   * So we pass an empty list array to avoid the runtime query error.
   *
   * Your "Email List" feature is currently handled by:
   * /admin/email/list  (emailSubscribers table)
   */
  const lists: { id: string; name: string }[] = [];

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#202030]">Email</h1>
          <p className="text-sm text-[#202030]/70">
            Create campaigns, send to waitlist/manual recipients, and review logs.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/email/campaigns"
            className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Campaigns
          </Link>

          <Link
            href="/admin/email/logs"
            className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Logs
          </Link>

          <Link
            href="/admin/email/list"
            className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Email List
          </Link>
        </div>
      </div>

      {/* Send a campaign */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Send a campaign</h2>

        <SendCampaignForm
          templates={templates} // ✅ always array
          lists={lists}         // ✅ always array (empty until you create email_lists table)
          action={createAndSendCampaignAction}
        />

        {lists.length === 0 ? (
          <p className="mt-3 text-xs text-gray-500">
            Note: “Email List” dropdown is disabled until you add an <code>email_lists</code> table.
            You can still manage subscribers at{" "}
            <Link className="font-semibold underline" href="/admin/email/list">
              /admin/email/list
            </Link>
            .
          </p>
        ) : null}
      </section>

      {/* Campaigns (quick view) */}
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="grid grid-cols-12 bg-black/[0.02] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
          <div className="col-span-5">Name</div>
          <div className="col-span-3">Segment</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Created</div>
        </div>

        <div className="divide-y">
          {campaigns.map((c) => (
            <div key={c.id} className="grid grid-cols-12 items-center px-5 py-3 text-sm">
              <div className="col-span-5 font-semibold text-[#202030]">
                <Link href={`/admin/email/campaigns/${c.id}`} className="hover:underline">
                  {c.name}
                </Link>
                <div className="mt-1 text-xs text-[#202030]/60">{c.subject}</div>
              </div>

              <div className="col-span-3 text-xs text-[#202030]/70">{c.segment}</div>

              <div className="col-span-2">
                <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                  {c.status}
                </span>
              </div>

              <div className="col-span-2 text-xs text-[#202030]/70">
                {new Date(c.createdAt as any).toLocaleString()}
              </div>
            </div>
          ))}

          {campaigns.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#202030]/60">
              No campaigns yet.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
