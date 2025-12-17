// app/(admin)/admin/page.tsx
import Link from "next/link";
import { db } from "@/drizzle/db";
import { waitlist } from "@/drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Quick overview of today’s workload.</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/waitlist"
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Review Waitlist →
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pending Waitlist" value={pending} />
        <Kpi label="Approved" value={approved} />
        <Kpi label="Rejected" value={rejected} />
        <Kpi label="Total" value={pending + approved + rejected} />
      </div>

      {/* Recent activity */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent Waitlist</h2>
            <p className="text-sm text-gray-600">Latest entries from the database.</p>
          </div>
          <Link href="/admin/waitlist" className="text-sm font-semibold text-gray-900 hover:underline">
            View all →
          </Link>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border">
          <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <div className="col-span-4">Name</div>
            <div className="col-span-4">Email</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Created</div>
          </div>

          <div className="divide-y">
            {recent.map((r) => {
              const created =
                r.createdAt instanceof Date
                  ? r.createdAt.toLocaleString("en-US", { month: "short", day: "numeric" })
                  : new Date(r.createdAt as any).toLocaleString("en-US", { month: "short", day: "numeric" });

              return (
                <div key={r.id} className="grid grid-cols-12 px-4 py-3 text-sm">
                  <div className="col-span-4 font-medium text-gray-900">{r.fullName}</div>
                  <div className="col-span-4 text-gray-700">{r.email}</div>
                  <div className="col-span-2">
                    <span className="rounded-full border px-2 py-0.5 text-xs font-semibold">
                      {r.status}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-gray-500">{created}</div>
                </div>
              );
            })}
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">No waitlist entries yet.</div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
