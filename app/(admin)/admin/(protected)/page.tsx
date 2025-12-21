// app/(admin)/admin/(protected)/page.tsx
import Link from "next/link";

import { db } from "@/drizzle/db";
import { waitlist } from "@/drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";

import AnalyticsPanel from "./_components/AnalyticsPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRAND = {
  primary: "#E00040",
  accent: "#B04020",
  dark: "#202030",
};

export default async function AdminDashboardPage() {
  const [pendingRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(waitlist)
    .where(eq(waitlist.status, "pending"));

  const [approvedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(waitlist)
    .where(eq(waitlist.status, "approved"));

  const [rejectedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(waitlist)
    .where(eq(waitlist.status, "rejected"));

  const pending = pendingRow?.count ?? 0;
  const approved = approvedRow?.count ?? 0;
  const rejected = rejectedRow?.count ?? 0;
  const total = pending + approved + rejected;

  const recent = await db
    .select({
      id: waitlist.id,
      fullName: waitlist.fullName,
      email: waitlist.email,
      status: waitlist.status,
      createdAt: waitlist.createdAt,
    })
    .from(waitlist)
    .orderBy(desc(waitlist.createdAt))
    .limit(8);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pending" value={pending} hint="Needs review" tone="warning" />
        <Kpi label="Approved" value={approved} hint="Invites sent" tone="success" />
        <Kpi label="Rejected" value={rejected} hint="Not eligible" tone="danger" />
        <Kpi label="Total" value={total} hint="All statuses" tone="brand" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ActionCard
          title="Waitlist"
          desc="Approve, reject, and generate invites."
          href="/admin/waitlist"
          badge={`${pending} pending`}
          color={BRAND.accent}
        />
        <ActionCard
          title="Email"
          desc="Campaigns, templates, and logs."
          href="/admin/email"
          badge="Open center"
          color={BRAND.primary}
        />
        <ActionCard
          title="Settings"
          desc="System toggles and admin controls."
          href="/admin/settings"
          badge="Manage"
          color={BRAND.dark}
        />
      </div>

      {/* Analytics (Looker + Clarity) */}
      <AnalyticsPanel />

      {/* Recent */}
      <section className="overflow-hidden rounded-3xl border bg-black/[0.02] shadow-sm">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#202030]">Recent waitlist</h2>
            <p className="text-sm text-[#202030]/70">
              Latest entries pulled from the database.
            </p>
          </div>

          <Link
            href="/admin/waitlist"
            className="text-sm font-semibold transition hover:underline"
            style={{ color: BRAND.primary }}
          >
            View all →
          </Link>
        </div>

        <div className="border-t bg-white">
          <div className="grid grid-cols-12 bg-black/[0.02] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
            <div className="col-span-4">Name</div>
            <div className="col-span-4">Email</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Created</div>
          </div>

          <div className="divide-y">
            {recent.map((r) => {
              const created = formatShortDate(r.createdAt);

              return (
                <div key={r.id} className="grid grid-cols-12 items-center px-5 py-3 text-sm">
                  <div className="col-span-4 font-medium text-[#202030]">{r.fullName}</div>
                  <div className="col-span-4 text-[#202030]/80">{r.email}</div>
                  <div className="col-span-2">
                    <StatusPill status={r.status} />
                  </div>
                  <div className="col-span-2 text-xs text-[#202030]/60">{created}</div>
                </div>
              );
            })}

            {recent.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[#202030]/60">
                No waitlist entries yet.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function formatShortDate(d: unknown) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d as any);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "rejected"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-amber-50 text-amber-800 border-amber-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "warning" | "success" | "danger" | "brand";
}) {
  const ring =
    tone === "success"
      ? "ring-emerald-200"
      : tone === "danger"
      ? "ring-rose-200"
      : tone === "warning"
      ? "ring-amber-200"
      : "ring-[#E00040]/20";

  const dot =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "danger"
      ? "bg-rose-500"
      : tone === "warning"
      ? "bg-amber-500"
      : "bg-[#E00040]";

  return (
    <div className={`rounded-3xl border bg-black/[0.02] p-5 shadow-sm ring-1 ${ring}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#202030]">{label}</p>
        <span className={`h-2 w-2 rounded-full ${dot}`} />
      </div>

      <p className="mt-2 text-3xl font-bold text-[#202030]">{value}</p>
      <p className="mt-1 text-sm text-[#202030]/60">{hint}</p>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  href,
  badge,
  color,
}: {
  title: string;
  desc: string;
  href: string;
  badge: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl border bg-black/[0.02] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-10"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#202030]">{title}</h3>
          <p className="mt-1 text-sm text-[#202030]/70">{desc}</p>
        </div>

        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${color}1A`, color }}
        >
          {badge}
        </span>
      </div>

      <div className="relative mt-4 text-sm font-semibold" style={{ color }}>
        Open →
      </div>
    </Link>
  );
}
