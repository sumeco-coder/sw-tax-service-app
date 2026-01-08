// app/(admin)/admin/(protected)/documents/requests/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { sql, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAdminRole(role: unknown) {
  const r = String(role ?? "").toUpperCase();
  return ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"].includes(r);
}

function fmtLastActive(d: Date | null) {
  if (!d) return "Never";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default async function DocumentRequestCenterPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const auth = await getServerRole();
  if (!auth) return redirect("/admin/sign-in");
  if (!isAdminRole(auth.role)) return redirect("/admin");

  const q = (searchParams?.q ?? "").trim();
  const whereParts: SQL[] = [];

  if (q) {
    const like = `%${q}%`;
    whereParts.push(or(ilike(users.name, like), ilike(users.email, like))!);
  }

  const base = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      onboardingStep: users.onboardingStep,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users);

  const rows = whereParts.length
    ? await base.where(sql.join(whereParts, sql` and `)).orderBy(sql`${users.lastSeenAt} desc nulls last`)
    : await base.orderBy(sql`${users.lastSeenAt} desc nulls last`);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documents</p>
        <h1 className="text-2xl font-black tracking-tight">Request center</h1>
        <p className="text-sm text-muted-foreground">
          Pick a client to generate a document request email + upload link.
        </p>
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-3 sm:px-4">
        <div className="rounded-3xl border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
          <div className="p-3 sm:p-4">
            <form method="GET" className="flex items-center gap-2">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search client name or email…"
                className="h-10 w-full rounded-2xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
              />
              <button className="h-10 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90">
                Search
              </button>
              {q ? (
                <Link
                  href="/admin/documents/requests"
                  className="h-10 inline-flex items-center rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
                >
                  Clear
                </Link>
              ) : null}
            </form>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="hidden lg:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <div className="col-span-4">Client</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Onboarding</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">No clients found.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((u) => (
              <li key={u.id} className="px-4 py-4 hover:bg-muted/30 transition">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-center">
                  <div className="lg:col-span-4 min-w-0">
                    <div className="font-semibold truncate">{u.name ?? "Client"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Last active: {fmtLastActive(u.lastSeenAt ?? null)}
                    </div>
                  </div>

                  <div className="lg:col-span-4 min-w-0 text-sm text-muted-foreground truncate">
                    {u.email ?? "—"}
                  </div>

                  <div className="lg:col-span-2">
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-muted text-muted-foreground ring-border">
                      {String(u.onboardingStep ?? "—")}
                    </span>
                  </div>

                  <div className="lg:col-span-2 flex flex-wrap gap-2 lg:justify-end">
                    <Link
                      href={`/admin/clients/${u.id}/documents`}
                      className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                    >
                      Docs
                    </Link>
                    <Link
                      href={`/admin/clients/${u.id}/documents/request`}
                      className="rounded-xl bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90 transition"
                    >
                      Request
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
