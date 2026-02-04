// app/(admin)/admin/(protected)/documents/requests/tracker/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock, ListChecks } from "lucide-react";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { documentRequests, documentRequestItems, users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

import {
  adminBumpReminderFromForm,
  adminCancelRequestFromForm,
  adminMarkRequestCompletedFromForm,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAdminRole(role: unknown) {
  const r = String(role ?? "").toUpperCase();
  return ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"].includes(r);
}

function escapeLike(s: string) {
  return s.replace(/[%_\\]/g, "\\$&");
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

export default async function RequestsTrackerPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string };
}) {
  const auth = await getServerRole();
  if (!auth) return redirect("/admin/sign-in");
  if (!isAdminRole(auth.role)) return redirect("/admin");

  const q = (searchParams?.q ?? "").trim();
  const rawStatus = (searchParams?.status ?? "open").trim();

  const allowed = new Set(["all", "open", "completed", "cancelled"]);
  const status = allowed.has(rawStatus) ? rawStatus : "open";

  const hrefWith = (next: Partial<{ q: string; status: string }>) => {
    const params = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextStatus = next.status ?? status;
    if (nextQ) params.set("q", nextQ);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    const s = params.toString();
    return s ? `/admin/documents/requests/tracker?${s}` : "/admin/documents/requests/tracker";
  };

  const returnTo = hrefWith({});

  const conds: any[] = [];

  if (q) {
    const like = `%${escapeLike(q)}%`;
    conds.push(sql`
      (
        lower(${users.email}) like lower(${like}) escape '\\'
        OR lower(coalesce(${users.name}, '')) like lower(${like}) escape '\\'
        OR lower(coalesce(${users.firstName}, '')) like lower(${like}) escape '\\'
        OR lower(coalesce(${users.lastName}, '')) like lower(${like}) escape '\\'
      )
    `);
  }

  if (status !== "all") {
    conds.push(eq(documentRequests.status as any, status as any));
  }

  const where = conds.length ? and(...conds) : undefined;

  const rows = await db
    .select({
      requestId: documentRequests.id,
      userId: documentRequests.userId,
      clientEmail: users.email,
      clientName: sql<string | null>`
        nullif(
          coalesce(
            nullif(${users.name}, ''),
            nullif(trim(concat_ws(' ', ${users.firstName}, ${users.lastName})), ''),
            ${users.email}
          ),
          ''
        )
      `,
      status: documentRequests.status as any,
      dueDate: documentRequests.dueDate,
      createdAt: documentRequests.createdAt,
      reminderCount: documentRequests.reminderCount,
      lastRemindedAt: documentRequests.lastRemindedAt,

      itemsTotal: sql<number>`count(${documentRequestItems.id})`.mapWith(Number),
      itemsRequested: sql<number>`
        count(${documentRequestItems.id}) filter (where ${documentRequestItems.status} = 'requested')
      `.mapWith(Number),
      itemsUploaded: sql<number>`
        count(${documentRequestItems.id}) filter (where ${documentRequestItems.status} = 'uploaded')
      `.mapWith(Number),
      itemsWaived: sql<number>`
        count(${documentRequestItems.id}) filter (where ${documentRequestItems.status} = 'waived')
      `.mapWith(Number),
    })
    .from(documentRequests)
    .innerJoin(users, eq(users.id, documentRequests.userId))
    .leftJoin(documentRequestItems, eq(documentRequestItems.requestId, documentRequests.id))
    .where(where)
    .groupBy(
      documentRequests.id,
      documentRequests.userId,
      documentRequests.status,
      documentRequests.dueDate,
      documentRequests.createdAt,
      documentRequests.reminderCount,
      documentRequests.lastRemindedAt,
      users.email,
      users.name,
      users.firstName,
      users.lastName,
    )
    .orderBy(desc(documentRequests.createdAt))
    .limit(300);

  const filterBtn = (label: string, key: string) => {
    const active = status === key;
    return (
      <Link
        href={hrefWith({ status: key })}
        className={[
          "h-10 inline-flex items-center justify-center rounded-2xl px-4 text-sm font-semibold ring-1 transition",
          active
            ? "bg-foreground text-background ring-foreground"
            : "bg-background text-foreground ring-border hover:bg-muted",
        ].join(" ")}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ListChecks className="h-4 w-4" />
            Documents
          </div>
          <h1 className="text-2xl font-black tracking-tight">Requests tracker</h1>
          <p className="text-sm text-muted-foreground">
            Track requests + reminders + progress (Requested / Uploaded / Waived).
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/documents/requests"
            className="h-10 inline-flex items-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
          >
            Request center <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-3 sm:px-4">
        <div className="rounded-3xl border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
          <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            <form className="flex w-full items-center gap-2 lg:max-w-[560px]" method="GET">
              <input type="hidden" name="status" value={status} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search client or email…"
                className="h-10 w-full rounded-2xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
              />
              <button className="h-10 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90">
                Search
              </button>
              {q ? (
                <Link
                  href={hrefWith({ q: "" })}
                  className="h-10 inline-flex items-center rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
                >
                  Clear
                </Link>
              ) : null}
            </form>

            <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-nowrap">
              {filterBtn("All", "all")}
              {filterBtn("Open", "open")}
              {filterBtn("Completed", "completed")}
              {filterBtn("Cancelled", "cancelled")}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="hidden lg:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <div className="col-span-4">Client</div>
          <div className="col-span-3">Progress</div>
          <div className="col-span-2">Due</div>
          <div className="col-span-2">Reminders</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">No requests found.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const openHref = `/admin/clients/${r.userId}/documents/requests?requestId=${encodeURIComponent(
                String(r.requestId),
              )}`;

              const prog = `${r.itemsUploaded}/${r.itemsTotal} uploaded`;

              return (
                <li key={String(r.requestId)} className="px-4 py-4 hover:bg-muted/30 transition">
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-center">
                    <div className="lg:col-span-4 min-w-0">
                      <div className="font-semibold truncate">{r.clientName ?? "Client"}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.clientEmail ?? "—"}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Request: <span className="font-mono">{String(r.requestId).slice(0, 8)}…</span>
                        {" • "}
                        <span className="uppercase">{String(r.status)}</span>
                      </div>
                    </div>

                    <div className="lg:col-span-3 text-sm text-muted-foreground">
                      <div className="font-semibold text-foreground">{prog}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Requested: {r.itemsRequested} • Waived: {r.itemsWaived}
                      </div>
                    </div>

                    <div className="lg:col-span-2 text-sm">
                      <div className="inline-flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{fmtDate(r.dueDate ?? null)}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Created: {fmtDate(r.createdAt ?? null)}
                      </div>
                    </div>

                    <div className="lg:col-span-2 text-sm text-muted-foreground">
                      <div>Count: {Number(r.reminderCount ?? 0)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Last: {fmtDate(r.lastRemindedAt ?? null)}
                      </div>
                    </div>

                    <div className="lg:col-span-1 lg:text-right">
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Link
                          href={openHref}
                          className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          Open
                        </Link>

                        <form action={adminBumpReminderFromForm}>
                          <input type="hidden" name="requestId" value={String(r.requestId)} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                            Remind
                          </button>
                        </form>

                        {String(r.status) === "open" ? (
                          <>
                            <form action={adminMarkRequestCompletedFromForm}>
                              <input type="hidden" name="requestId" value={String(r.requestId)} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <button className="rounded-xl bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90">
                                Complete
                              </button>
                            </form>

                            <form action={adminCancelRequestFromForm}>
                              <input type="hidden" name="requestId" value={String(r.requestId)} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <button className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                                Cancel
                              </button>
                            </form>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
