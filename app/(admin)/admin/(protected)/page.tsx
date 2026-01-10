// app/(admin)/admin/(protected)/page.tsx
import Link from "next/link";
import { db } from "@/drizzle/db";
import { waitlist } from "@/drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";
import AnalyticsPanel from "./_components/AnalyticsPanel";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

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
        <div className="border-t bg-white">
  <div className="w-full overflow-x-auto">
    <Table className="w-full table-fixed">
      {/* Optional: helps control column sizing */}
      <colgroup>
        <col className="w-[45%]" />
        <col className="w-[35%]" />
        <col className="w-[10%]" />
        <col className="w-[10%]" />
      </colgroup>

      <TableHeader>
        <TableRow className="bg-black/[0.02]">
          <TableHead className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
            Name
          </TableHead>

          {/* Hide Email column on mobile */}
          <TableHead className="hidden px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60 sm:table-cell">
            Email
          </TableHead>

          <TableHead className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
            Status
          </TableHead>

          <TableHead className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
            Created
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {recent.map((r) => {
          const created = formatShortDate(r.createdAt);

          return (
            <TableRow key={r.id} className="border-b last:border-0">
              <TableCell className="px-5 py-3 align-middle">
                <div className="font-medium text-[#202030]">{r.fullName}</div>

                {/* Mobile: show email under name */}
                <div className="mt-0.5 truncate text-xs text-[#202030]/70 sm:hidden">
                  {r.email}
                </div>
              </TableCell>

              {/* Desktop email */}
              <TableCell className="hidden px-5 py-3 align-middle text-[#202030]/80 sm:table-cell">
                <div className="truncate">{r.email}</div>
              </TableCell>

              <TableCell className="px-5 py-3 align-middle">
                <div className="inline-flex whitespace-nowrap">
                  <StatusPill status={r.status} />
                </div>
              </TableCell>

              <TableCell className="px-5 py-3 align-middle text-xs text-[#202030]/60 whitespace-nowrap">
                {created}
              </TableCell>
            </TableRow>
          );
        })}

        {recent.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={4}
              className="px-5 py-10 text-center text-sm text-[#202030]/60"
            >
              No waitlist entries yet.
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
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
