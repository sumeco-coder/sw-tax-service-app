// app/(admin)/admin/(protected)/clients/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { users, documents, taxReturns } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";
import { desc, eq, sql } from "drizzle-orm";
import { adminCreateClientAndRedirect } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const fmt = new Intl.NumberFormat("en-US");

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
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
    totalClients,
    newClients7,
    active7,
    active30,
    docs7,
    onboardingCounts,
    returnsByStatusThisYear,
    newestClients,
  ] = await Promise.all([
    db.select({ c: sql<number>`count(*)`.mapWith(Number) }).from(users).then(r => r[0]?.c ?? 0),

    db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(sql`${users.createdAt} >= ${since7}`)
      .then(r => r[0]?.c ?? 0),

    db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(sql`${users.lastSeenAt} is not null and ${users.lastSeenAt} >= ${since7}`)
      .then(r => r[0]?.c ?? 0),

    db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(sql`${users.lastSeenAt} is not null and ${users.lastSeenAt} >= ${since30}`)
      .then(r => r[0]?.c ?? 0),

    db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(documents)
      .where(sql`${documents.uploadedAt} >= ${since7}`)
      .then(r => r[0]?.c ?? 0),

    db
      .select({
        step: users.onboardingStep,
        c: sql<number>`count(*)`.mapWith(Number),
      })
      .from(users)
      .groupBy(users.onboardingStep),

    db
      .select({
        status: taxReturns.status,
        c: sql<number>`count(*)`.mapWith(Number),
      })
      .from(taxReturns)
      .where(eq(taxReturns.taxYear, new Date().getFullYear()))
      .groupBy(taxReturns.status),

    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        onboardingStep: users.onboardingStep,
        createdAt: users.createdAt,
        lastSeenAt: users.lastSeenAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10),
  ]);

  const onboardingMap = new Map<string, number>();
  for (const r of onboardingCounts) onboardingMap.set(String(r.step), r.c ?? 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Client Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            KPIs for new clients, onboarding, docs, and portal activity.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/clients"
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Client List
          </Link>
          <Link
            href="/admin/returns"
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Returns
          </Link>
        </div>
      </div>

        {/* ✅ Create Client (Invite) */}
      <details className="rounded-2xl border bg-background/80 shadow-sm">
        <summary className="cursor-pointer select-none p-4 font-medium">
          Create client (send invite)
        </summary>

        <form
          action={adminCreateClientAndRedirect}
          className="p-4 pt-0 grid gap-3 sm:grid-cols-2"
        >
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Email</label>
            <input
              name="email"
              type="email"
              required
              className="h-10 rounded-md border px-3 bg-background"
              placeholder="client@email.com"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Phone (optional)</label>
            <input
              name="phone"
              className="h-10 rounded-md border px-3 bg-background"
              placeholder="+17025551234"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">First name (optional)</label>
            <input name="firstName" className="h-10 rounded-md border px-3 bg-background" />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Last name (optional)</label>
            <input name="lastName" className="h-10 rounded-md border px-3 bg-background" />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Role (optional)</label>
            <input
              name="role"
              className="h-10 rounded-md border px-3 bg-background"
              placeholder="client"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">AgencyId (optional)</label>
            <input name="agencyId" className="h-10 rounded-md border px-3 bg-background" />
          </div>

           <div className="grid gap-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">Invite method</label>
            <select
              name="inviteMode"
              defaultValue="branded"
              className="h-10 rounded-md border px-3 bg-background"
            >
              <option value="branded">Branded email (Resend) + Forgot password</option>
              <option value="cognito">Cognito invite (temp password email)</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium">
              Create & Send Invite
            </button>
          </div>
        </form>
      </details>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Total clients" value={fmt.format(totalClients)} />
        <Card label="New (last 7 days)" value={fmt.format(newClients7)} />
        <Card label="Active (last 7 days)" value={fmt.format(active7)} />
        <Card label="Active (last 30 days)" value={fmt.format(active30)} />
        <Card label="Docs uploaded (7 days)" value={fmt.format(docs7)} />
        <Card label="Onboarding: PROFILE" value={fmt.format(onboardingMap.get("PROFILE") ?? 0)} />
        <Card label="Onboarding: SUBMITTED" value={fmt.format(onboardingMap.get("SUBMITTED") ?? 0)} />
        <Card label="Onboarding: DONE" value={fmt.format(onboardingMap.get("DONE") ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-background/80 shadow-sm">
          <div className="border-b p-4 flex items-center justify-between">
            <h2 className="font-semibold">Onboarding distribution</h2>
            <Link className="text-sm underline underline-offset-4" href="/admin/clients?sort=onboarding">
              View
            </Link>
          </div>
          <div className="p-4 space-y-2 text-sm">
            {Array.from(onboardingMap.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([step, c]) => (
                <div key={step} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{step}</span>
                  <span className="font-medium">{fmt.format(c)}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-background/80 shadow-sm">
          <div className="border-b p-4 flex items-center justify-between">
            <h2 className="font-semibold">Returns status snapshot (this year)</h2>
            <Link className="text-sm underline underline-offset-4" href="/admin/returns">
              View
            </Link>
          </div>
          <div className="p-4 space-y-2 text-sm">
            {returnsByStatusThisYear
              .sort((a, b) => (b.c ?? 0) - (a.c ?? 0))
              .map((r) => (
                <div key={String(r.status)} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{String(r.status)}</span>
                  <span className="font-medium">{fmt.format(r.c ?? 0)}</span>
                </div>
              ))}
            {!returnsByStatusThisYear.length ? (
              <p className="text-sm text-muted-foreground">No returns yet.</p>
            ) : null}
          </div>
        </div>
      </div>

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
            {newestClients.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.name ?? "—"}</td>
                <td className="p-3">{String(u.onboardingStep)}</td>
                <td className="p-3">{new Date(u.createdAt as any).toLocaleString("en-US")}</td>
                <td className="p-3">
                  {u.lastSeenAt ? new Date(u.lastSeenAt as any).toLocaleString("en-US") : "—"}
                </td>
              </tr>
            ))}
            {!newestClients.length ? (
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
        “Portal activity” is based on <code>users.lastSeenAt</code>.
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
