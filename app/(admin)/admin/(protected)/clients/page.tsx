// app/(admin)/admin/(protected)/clients/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { users, documents, taxReturns, dependents } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";
import { desc, eq, sql } from "drizzle-orm";
import InviteEmailPreviewButton from "./_components/InviteEmailPreviewButton";
import {
  adminCreateClientAndRedirect,
  adminResendClientInviteFromForm,
  adminResetClientPasswordFromForm,
  adminDeleteTestUserFromForm,
} from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const fmt = new Intl.NumberFormat("en-US");

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function getStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

function looksLikeTestEmail(email: string) {
  const e = String(email || "").toLowerCase();
  return (
    e.includes("+test") ||
    e.includes("+qa") ||
    e.includes("+dev") ||
    e.endsWith("@example.com") ||
    e.endsWith("@test.com")
  );
}

type SP = Record<string, string | string[] | undefined>;

export default async function ClientActivityReportPage({
  searchParams,
}: {
  searchParams?: Promise<SP>;
}) {
  const me = await getServerRole();
  if (!me?.sub) redirect("/admin/sign-in");

  const role = String(me?.role ?? "").toLowerCase();
  if (!(role === "admin" || role === "superadmin")) redirect("/not-authorized");

  const sp = (await searchParams) ?? {};

  const toast = getStr(sp.toast);
  const msg = getStr(sp.msg);
  const mode = getStr(sp.mode);

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
    db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .then((r) => r[0]?.c ?? 0),

    db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(sql`${users.createdAt} >= ${since7}`)
      .then((r) => r[0]?.c ?? 0),

    db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(
        sql`${users.lastSeenAt} is not null and ${users.lastSeenAt} >= ${since7}`,
      )
      .then((r) => r[0]?.c ?? 0),

    db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(
        sql`${users.lastSeenAt} is not null and ${users.lastSeenAt} >= ${since30}`,
      )
      .then((r) => r[0]?.c ?? 0),

    db
      .select({ c: sql<number>`count(*)`.mapWith(Number) })
      .from(documents)
      .where(sql`${documents.uploadedAt} >= ${since7}`)
      .then((r) => r[0]?.c ?? 0),

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
        firstName: users.firstName,
        role: users.role,
        agencyId: users.agencyId,
        name: users.name,
        onboardingStep: users.onboardingStep,
        createdAt: users.createdAt,
        lastSeenAt: users.lastSeenAt,

        dependentsCount: sql<number>`
      (select count(*)
       from ${dependents}
       where ${dependents.userId} = ${users.id})
    `.mapWith(Number),

        documentsCount: sql<number>`
      (select count(*)
       from ${documents}
       where ${documents.userId} = ${users.id})
    `.mapWith(Number),
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10),
  ]);

  const onboardingMap = new Map<string, number>();
  for (const r of onboardingCounts) onboardingMap.set(String(r.step), r.c ?? 0);

  const returnsStatusMap = new Map<string, number>();
  for (const r of returnsByStatusThisYear) {
    returnsStatusMap.set(String(r.status), r.c ?? 0);
  }

  const byStatus = (status: string) => returnsStatusMap.get(status) ?? 0;
  const returnsInProgress = byStatus("IN_PROGRESS");
  const returnsFiled = byStatus("FILED");
  const returnsAccepted = byStatus("ACCEPTED");
  const returnsTotal = Array.from(returnsStatusMap.values()).reduce(
    (a, b) => a + b,
    0,
  );

  const toastText =
    toast === "create_ok"
      ? `Invite sent (${mode || "branded"}).`
      : toast === "create_failed"
        ? `Create failed: ${msg || "Unknown error"}`
        : toast === "resend_ok"
          ? `Invite resent (${mode || "branded"}).`
          : toast === "resend_failed"
            ? `Resend failed: ${msg || "Unknown error"}`
            : toast === "pw_reset_ok"
              ? "Password reset email sent."
              : toast === "pw_reset_failed"
                ? `Reset failed: ${msg || "Unknown error"}`
                : toast === "delete_ok"
                  ? "Test user deleted."
                  : toast === "delete_failed"
                    ? `Delete failed: ${msg || "Unknown error"}`
                    : "";

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

      {toastText ? (
        <div className="rounded-2xl border bg-background/80 px-4 py-3 text-sm">
          {toastText}
        </div>
      ) : null}

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
            <label className="text-xs text-muted-foreground">
              Phone (optional)
            </label>
            <input
              name="phone"
              className="h-10 rounded-md border px-3 bg-background"
              placeholder="+17025551234"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">
              First name (optional)
            </label>
            <input
              name="firstName"
              className="h-10 rounded-md border px-3 bg-background"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">
              Last name (optional)
            </label>
            <input
              name="lastName"
              className="h-10 rounded-md border px-3 bg-background"
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">User role</label>
            <select
              name="role"
              defaultValue="TAXPAYER"
              className="h-10 rounded-md border px-3 bg-background"
            >
              <option value="TAXPAYER">TAXPAYER</option>
              <option value="LMS_PREPARER">LMS_PREPARER</option>
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">
              AgencyId (optional)
            </label>
            <input
              name="agencyId"
              className="h-10 rounded-md border px-3 bg-background"
              placeholder="UUID (optional)"
            />
          </div>

          <div className="grid gap-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">
              Invite method
            </label>
            <select
              name="inviteMode"
              defaultValue="branded"
              className="h-10 rounded-md border px-3 bg-background"
            >
              <option value="branded">Branded email (Resend)</option>
              <option value="cognito">
                Cognito invite (temp password email)
              </option>
            </select>
          </div>

          <div className="grid gap-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">
              Where should they go after accept?
            </label>
            <select
              name="inviteNext"
              defaultValue="/onboarding/profile"
              className="h-10 rounded-md border px-3 bg-background"
            >
              <option value="/onboarding/profile">
                Taxpayer → Onboarding (profile)
              </option>
              <option value="/dashboard">Taxpayer → Dashboard</option>
              <option value="/agency">LMS Preparer → /agency</option>
            </select>

            <p className="text-[11px] text-muted-foreground">
              Branded invites will include this as <code>next</code> in the
              email link. (For LMS role, server-side will force{" "}
              <code>/agency</code>.)
            </p>
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2">
            <InviteEmailPreviewButton />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
            >
              Create &amp; Send Invite
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
        <Card
          label="Onboarding: PROFILE"
          value={fmt.format(onboardingMap.get("PROFILE") ?? 0)}
        />
        <Card
          label="Onboarding: SUBMITTED"
          value={fmt.format(onboardingMap.get("SUBMITTED") ?? 0)}
        />
        <Card
          label="Onboarding: DONE"
          value={fmt.format(onboardingMap.get("DONE") ?? 0)}
        />
        <Card
          label="Returns: IN_PROGRESS (this year)"
          value={fmt.format(returnsInProgress)}
        />
        <Card
          label="Returns: FILED (this year)"
          value={fmt.format(returnsFiled)}
        />
        <Card
          label="Returns: ACCEPTED (this year)"
          value={fmt.format(returnsAccepted)}
        />
        <Card
          label="Returns: TOTAL (this year)"
          value={fmt.format(returnsTotal)}
        />
      </div>

      <div className="rounded-2xl border bg-background/80 shadow-sm overflow-x-auto">
        <div className="border-b p-4">
          <h2 className="font-semibold">Newest clients (quick resend)</h2>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Onboarding</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Dependents</th>
              <th className="p-3 text-left">Docs</th>
              <th className="p-3 text-left">Sensitive</th>
              <th className="p-3 text-left">Resend invite</th>
              <th className="p-3 text-left">Reset</th>
              <th className="p-3 text-left">Delete (test)</th>
            </tr>
          </thead>

          <tbody>
            {newestClients.map((u) => {
              const r = String(u.role ?? "TAXPAYER");
              const defaultInviteNext =
                r === "LMS_PREPARER" ? "/agency" : "/onboarding/profile";
              const email = String(u.email ?? "");
              const canDelete = looksLikeTestEmail(email);

              return (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-3">{email}</td>
                  <td className="p-3">{r}</td>
                  <td className="p-3">{String(u.onboardingStep)}</td>
                  <td className="p-3">
                    {new Date(u.createdAt as any).toLocaleString("en-US")}
                  </td>

                  <td className="p-3">
                    <Link
                      className="text-xs font-medium underline underline-offset-4"
                      href={`/admin/clients/${u.id}/dependents`}
                    >
                      View ({Number((u as any).dependentsCount ?? 0)})
                    </Link>
                  </td>

                  <td className="p-3">
                    <Link
                      className="text-xs font-medium underline underline-offset-4"
                      href={`/admin/clients/${u.id}/documents`}
                    >
                      View ({Number((u as any).documentsCount ?? 0)})
                    </Link>
                  </td>

                  <td className="p-3">
                    <Link
                      className="text-xs font-medium underline underline-offset-4"
                      href={`/admin/clients/${u.id}/sensitive`}
                    >
                      View SSN/Bank
                    </Link>
                  </td>

                  <td className="p-3">
                    <form
                      action={adminResendClientInviteFromForm}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="email" value={email} />
                      <input
                        type="hidden"
                        name="firstName"
                        value={String(u.firstName ?? "")}
                      />
                      <input type="hidden" name="role" value={r} />
                      <input
                        type="hidden"
                        name="agencyId"
                        value={String(u.agencyId ?? "")}
                      />

                      <select
                        name="inviteMode"
                        defaultValue="branded"
                        className="h-9 rounded-md border px-2 bg-background text-xs"
                      >
                        <option value="branded">Branded</option>
                        <option value="cognito">Cognito</option>
                      </select>

                      <select
                        name="inviteNext"
                        defaultValue={defaultInviteNext}
                        className="h-9 rounded-md border px-2 bg-background text-xs"
                        title="Where to send after accept"
                      >
                        <option value="/onboarding/profile">Onboarding</option>
                        <option value="/dashboard">Dashboard</option>
                        <option value="/agency">/agency</option>
                        <option value="/taxpayer/onboarding-sign-up">
                          Invite sign-up
                        </option>
                      </select>

                      <button className="h-9 rounded-md border px-3 text-xs font-medium">
                        Resend
                      </button>
                    </form>
                  </td>

                  <td className="p-3">
                    <form action={adminResetClientPasswordFromForm}>
                      <input type="hidden" name="email" value={email} />
                      <input
                        type="hidden"
                        name="returnTo"
                        value="/admin/clients"
                      />
                      <button className="h-9 rounded-md border px-3 text-xs font-medium">
                        Reset
                      </button>
                    </form>
                  </td>

                  <td className="p-3">
                    {canDelete ? (
                      <form action={adminDeleteTestUserFromForm}>
                        <input type="hidden" name="email" value={email} />
                        <input type="hidden" name="confirm" value="DELETE" />
                        <input type="hidden" name="deleteCognito" value="on" />
                        <input
                          type="hidden"
                          name="returnTo"
                          value="/admin/clients"
                        />
                        <button className="h-9 rounded-md border px-3 text-xs font-medium">
                          Delete
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {!newestClients.length ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={10}>
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
