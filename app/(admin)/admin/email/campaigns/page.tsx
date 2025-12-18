import Link from "next/link";
import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { desc } from "drizzle-orm";
import { createCampaign } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CampaignsPage() {
  const campaigns = await db
    .select({
      id: emailCampaigns.id,
      name: emailCampaigns.name,
      subject: emailCampaigns.subject,
      status: emailCampaigns.status,
      segment: emailCampaigns.segment,
      createdAt: emailCampaigns.createdAt,
      sentAt: emailCampaigns.sentAt,
    })
    .from(emailCampaigns)
    .orderBy(desc(emailCampaigns.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#202030]">Campaigns</h1>
          <p className="text-sm text-[#202030]/70">
            Create campaigns, select recipients, and send bulk emails.
          </p>
        </div>

        <Link
          href="/admin/email"
          className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
        >
          Back to Email →
        </Link>
      </div>

      {/* Create campaign */}
      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#202030]">New campaign</h2>

        <form action={createCampaign} className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              placeholder="Campaign name (internal)"
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
              required
            />
            <input
              name="subject"
              placeholder="Email subject"
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <select
              name="segment"
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
              defaultValue="waitlist_pending"
            >
              <option value="waitlist_pending">Waitlist: Pending</option>
              <option value="waitlist_approved">Waitlist: Approved</option>
              <option value="waitlist_all">Waitlist: All</option>
            </select>

            <input
              name="textBody"
              placeholder="Text body (optional)"
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30 sm:col-span-2"
            />
          </div>

          <textarea
            name="htmlBody"
            placeholder="HTML body (required) — paste HTML here"
            rows={8}
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
            required
          />

          <button
            type="submit"
            className="w-fit rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
          >
            Create campaign →
          </button>
        </form>
      </section>

      {/* List campaigns */}
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="grid grid-cols-12 bg-black/[0.02] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
          <div className="col-span-4">Campaign</div>
          <div className="col-span-4">Subject</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Segment</div>
        </div>

        <div className="divide-y">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/admin/email/campaigns/${c.id}`}
              className="grid grid-cols-12 items-center px-5 py-3 text-sm hover:bg-black/[0.02]"
            >
              <div className="col-span-4 font-medium text-[#202030]">
                {c.name}
                <div className="text-xs text-[#202030]/60">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt as any))}
                </div>
              </div>

              <div className="col-span-4 text-[#202030]/80">{c.subject}</div>

              <div className="col-span-2">
                <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                  {c.status}
                </span>
              </div>

              <div className="col-span-2 text-xs text-[#202030]/70">
                {c.segment}
              </div>
            </Link>
          ))}

          {campaigns.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#202030]/60">
              No campaigns yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
