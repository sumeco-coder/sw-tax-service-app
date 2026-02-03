import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { users, documents, taxReturns } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";
import { desc, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const fmt = new Intl.NumberFormat("en-US");

// ✅ controls "Online now"
const ONLINE_WINDOW_MINUTES = 2;
const ONLINE_MS = ONLINE_WINDOW_MINUTES * 60 * 1000;

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function isOnline(ts: unknown) {
  if (!ts) return false;
  const t = new Date(ts as any).getTime();
  return Number.isFinite(t) && t > Date.now() - ONLINE_MS;
}

function fmtDate(ts: unknown) {
  if (!ts) return "—";
  const d = new Date(ts as any);
  return Number.isFinite(d.getTime()) ? d.toLocaleString("en-US") : "—";
}

export default async function ClientActivityReportPage() {
  // ✅ Admin-only gate
  const me = await getServerRole();
  if (!me?.sub) redirect("/admin/sign-in");
  const role = String(me?.role ?? "").toLowerCase();
  if (!(role === "admin" || role === "superadmin")) redirect("/not-authorized");

  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [
    totals,
    new7,
    onlineNow,
    active7,
    active30,
    onboardingCounts,
    docs7,
    latestClients,
    returnsByStatusThisYear,
  ] = await Promise.all([
    // total clients
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .then((r) => r[0]?.count ?? 0),

    // new last 7 days
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(sql`${users.createdAt} >= ${since7}`)
      .then((r) => r[0]?.count ?? 0),

    // ✅ online now (lastSeenAt within X minutes)
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(
        sql`${users.lastSeenAt} is not null and ${users.lastSeenAt} >= now() - interval '${ONLINE_WINDOW_MINUTES} minutes'`
      )
      .then((r) => r[0]?.count ?? 0),

    // active last 7 days
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(sql`${users.lastSeenAt} is not null and ${users.lastSeenAt} >= ${since7}`)
      .then((r) => r[0]?.count ?? 0),

    // active last 30 days
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(sql`${users.lastSeenAt} is not null and ${users.lastSeenAt} >= ${since30}`)
      .then((r) => r[0]?.count ?? 0),

    // onboarding distribution
    db
      .select({
        step: users.onboardingStep,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(users)
      .groupBy(users.onboardingStep),

    // docs uploaded last 7 days
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(documents)
      .where(sql`${documents.uploadedAt} >= ${since7}`)
      .then((r) => r[0]?.count ?? 0),

    // newest clients
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        lastSeenAt: users.lastSeenAt,
        onboardingStep: users.onboardingStep,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10),

    // returns pipeline by status for current year
    db
      .select({
        status: taxReturns.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(taxReturns)
      .where(eq(taxReturns.taxYear, new Date().getFullYear()))
      .groupBy(taxReturns.status),
  ]);

  // normalize onboarding counts into a map
  const onboardingMap = new Map<string, number>();
  for (const r of onboardingCounts) {
    onboardingMap.set(String(r.step), r.count ?? 0);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Client Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            New clients, onboarding progress, portal activity, and document uploads.
          </p>
        </div>

        <Link
          href="/admin/clients"
          className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
        >
          View Clients
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Total clients" value={fmt.format(totals)} />
        <Card label="New (last 7 days)" value={fmt.format(new7)} />
        <Card label="Online now" value={fmt.format(onlineNow)} />
        <Card label="Active (last 7 days)" value={fmt.format(active7)} />
        <Card label="Active (last 30 days)" value={fmt.format(active30)} />
        <Card label="Docs uploaded (7 days)" value={fmt.format(docs7)} />
        <Card label="Onboarding: PROFILE" value={fmt.format(onboardingMap.get("PROFILE") ?? 0)} />
        <Card label="Onboarding: DOCUMENTS" value={fmt.format(onboardingMap.get("DOCUMENTS") ?? 0)} />
        <Card label="Onboarding: COMPLETE" value={fmt.format(onboardingMap.get("COMPLETE") ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Onboarding distribution */}
        <div className="rounded-2xl border bg-background/80 shadow-sm">
          <div className="border-b p-4">
            <h2 className="font-semibold">Onboarding step distribution</h2>
          </div>
          <div className="p-4 space-y-2 text-sm">
            {Array.from(onboardingMap.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([step, count]) => (
                <div key={step} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{step}</span>
                  <span className="font-medium">{fmt.format(count)}</span>
                </div>
              ))}
            {!onboardingMap.size ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : null}
          </div>
        </div>

        {/* Returns status snapshot */}
        <div className="rounded-2xl border bg-background/80 shadow-sm">
          <div className="border-b p-4 flex items-center justify-between">
            <h2 className="font-semibold">Returns status snapshot (this year)</h2>
            <Link
              href="/admin/returns"
              className="text-sm font-medium underline underline-offset-4"
            >
              Open Returns
            </Link>
          </div>
          <div className="p-4 space-y-2 text-sm">
            {returnsByStatusThisYear
              .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
              .map((r) => (
                <div key={String(r.status)} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{String(r.status)}</span>
                  <span className="font-medium">{fmt.format(r.count ?? 0)}</span>
                </div>
              ))}
            {!returnsByStatusThisYear.length ? (
              <p className="text-sm text-muted-foreground">No returns yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Latest clients */}
      <div className="rounded-2xl border bg-background/80 shadow-sm overflow-x-auto">
        <div className="border-b p-4">
          <h2 className="font-semibold">Newest clients</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Onboarding</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {latestClients.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.name ?? "—"}</td>
                <td className="p-3">{String(u.onboardingStep)}</td>
                <td className="p-3">{fmtDate(u.createdAt)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {isOnline(u.lastSeenAt) ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Online
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Offline
                      </span>
                    )}
                    <span>{fmtDate(u.lastSeenAt)}</span>
                  </div>
                </td>
              </tr>
            ))}
            {!latestClients.length ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={5}>
                  No clients yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        “Online now” = seen within {ONLINE_WINDOW_MINUTES} minutes. “Active” counts use lastSeenAt.
        For true login history, add a <code>user_events</code> table later.
      </p>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
