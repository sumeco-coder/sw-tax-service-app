import Link from "next/link";
import { redirect } from "next/navigation";
import { sql, ilike, or, and, eq, desc, inArray, type SQL } from "drizzle-orm";
import { ClipboardList, ArrowRight } from "lucide-react";

import { db } from "@/drizzle/db";
import { users, documentRequests, documentRequestItems } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAdminRole(role: unknown) {
  const r = String(role ?? "").toUpperCase();
  return ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"].includes(r);
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

type ReqStatus = "open" | "completed" | "cancelled";

type TrackerRow = {
  requestId: string;
  userId: string;
  clientName: string | null;
  email: string | null;
  status: ReqStatus;
  dueDate: Date | null;
  createdAt: Date;
  reminderCount: number;
  lastRemindedAt: Date | null;

  totalItems: number;
  requestedItems: number;
  uploadedItems: number;
  waivedItems: number;
};

export default async function DocumentRequestTrackerPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string; show?: string };
}) {
  const auth = await getServerRole();
  if (!auth) return redirect("/admin/sign-in");
  if (!isAdminRole(auth.role)) return redirect("/admin");

  const q = (searchParams?.q ?? "").trim();
  const rawStatus = (searchParams?.status ?? "open").trim(); // default open
  const rawShow = (searchParams?.show ?? "outstanding").trim(); // default show outstanding items

  const allowedStatuses = new Set(["all", "open", "completed", "cancelled"]);
  const status = (allowedStatuses.has(rawStatus) ? rawStatus : "open") as
    | "all"
    | ReqStatus;

  const allowedShows = new Set(["summary", "outstanding"]);
  const show = allowedShows.has(rawShow) ? rawShow : "outstanding";

  const hrefWith = (next: Partial<{ q: string; status: string; show: string }>) => {
    const params = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextStatus = next.status ?? status;
    const nextShow = next.show ?? show;

    if (nextQ) params.set("q", nextQ);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextShow && nextShow !== "outstanding") params.set("show", nextShow);

    const s = params.toString();
    return s ? `/admin/documents/requests/tracker?${s}` : "/admin/documents/requests/tracker";
  };

  // ---------- WHERE ----------
  const whereParts: SQL[] = [];

  if (q) {
    const like = `%${q}%`;
    whereParts.push(or(ilike(users.name, like), ilike(users.email, like))!);
  }

  if (status !== "all") {
    whereParts.push(eq(documentRequests.status as any, status as any));
  }

  // optional: only show requests with outstanding items
  if (show === "outstanding") {
    whereParts.push(sql`
      exists (
        select 1
        from ${documentRequestItems} i
        where i.request_id = ${documentRequests.id}
          and i.status = 'requested'
      )
    `);
  }

  const where = whereParts.length ? sql.join(whereParts, sql` and `) : undefined;

  // ---------- MAIN QUERY (grouped counts) ----------
  const raw = await db
    .select({
      requestId: documentRequests.id,
      userId: documentRequests.userId,
      email: users.email,
      clientName: sql<string | null>`
        nullif(
          coalesce(
            nullif(${users.name}, ''),
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

      totalItems: sql<number>`count(${documentRequestItems.id})`.mapWith(Number),
      requestedItems: sql<number>`
        count(${documentRequestItems.id})
        filter (where ${documentRequestItems.status} = 'requested')
      `.mapWith(Number),
      uploadedItems: sql<number>`
        count(${documentRequestItems.id})
        filter (where ${documentRequestItems.status} = 'uploaded')
      `.mapWith(Number),
      waivedItems: sql<number>`
        count(${documentRequestItems.id})
        filter (where ${documentRequestItems.status} = 'waived')
      `.mapWith(Number),
    })
    .from(documentRequests)
    .innerJoin(users, eq(users.id, documentRequests.userId))
    .leftJoin(documentRequestItems, eq(documentRequestItems.requestId, documentRequests.id))
    .where(where ? (where as any) : undefined)
    .groupBy(documentRequests.id, users.id)
    .orderBy(desc(documentRequests.createdAt))
    .limit(200);

  const rows: TrackerRow[] = raw.map((r) => ({
    requestId: String(r.requestId),
    userId: String(r.userId),
    clientName: r.clientName ? String(r.clientName) : null,
    email: r.email ? String(r.email) : null,
    status: (String(r.status) as ReqStatus) ?? "open",
    dueDate: (r.dueDate as Date | null) ?? null,
    createdAt: r.createdAt as Date,
    reminderCount: Number(r.reminderCount ?? 0),
    lastRemindedAt: (r.lastRemindedAt as Date | null) ?? null,
    totalItems: Number(r.totalItems ?? 0),
    requestedItems: Number(r.requestedItems ?? 0),
    uploadedItems: Number(r.uploadedItems ?? 0),
    waivedItems: Number(r.waivedItems ?? 0),
  }));

  // ---------- OUTSTANDING ITEMS (optional) ----------
  const requestIds = rows.map((r) => r.requestId);
  const outstandingByRequest = new Map<string, { label: string }[]>();

  if (show === "outstanding" && requestIds.length) {
    const items = await db
      .select({
        requestId: documentRequestItems.requestId,
        label: documentRequestItems.label,
        sortOrder: documentRequestItems.sortOrder,
      })
      .from(documentRequestItems)
      .where(
        and(
          inArray(documentRequestItems.requestId, requestIds as any),
          eq(documentRequestItems.status as any, "requested" as any),
        ) as any,
      )
      .orderBy(documentRequestItems.requestId, documentRequestItems.sortOrder);

    for (const it of items) {
      const rid = String(it.requestId);
      const list = outstandingByRequest.get(rid) ?? [];
      list.push({ label: String(it.label) });
      outstandingByRequest.set(rid, list);
    }
  }

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
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          Documents
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Request tracker</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Showing {rows.length} request{rows.length === 1 ? "" : "s"}
              {status !== "all" ? ` • Status: ${status}` : ""} • View: {show}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/documents/requests"
              className="h-10 inline-flex items-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
            >
              Request center <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href={hrefWith({ show: show === "outstanding" ? "summary" : "outstanding" })}
              className="h-10 inline-flex items-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
            >
              {show === "outstanding" ? "Show summary" : "Show outstanding"}
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky bar */}
      <div className="sticky top-0 z-20 -mx-4 px-3 sm:px-4">
        <div className="rounded-3xl border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
          <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <form method="GET" className="flex w-full items-center gap-2 lg:max-w-[680px]">
              <input type="hidden" name="status" value={status} />
              <input type="hidden" name="show" value={show} />
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
                  href={hrefWith({ q: "" })}
                  className="h-10 inline-flex items-center rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
                >
                  Clear
                </Link>
              ) : null}
            </form>

            {/* Status filters */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-nowrap">
              {filterBtn("All", "all")}
              {filterBtn("Open", "open")}
              {filterBtn("Completed", "completed")}
              {filterBtn("Cancelled", "cancelled")}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="hidden lg:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <div className="col-span-4">Client</div>
          <div className="col-span-2">Due</div>
          <div className="col-span-3">Progress</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">
            No requests found.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const outstanding = Math.max(0, r.requestedItems);
              const done = r.uploadedItems + r.waivedItems;
              const total = r.totalItems;

              const outstandingItems = outstandingByRequest.get(r.requestId) ?? [];

              return (
                <li key={r.requestId} className="px-4 py-4 hover:bg-muted/30 transition">
                  <div className="flex flex-col gap-2 lg:grid lg:grid-cols-12 lg:items-start">
                    {/* Client */}
                    <div className="lg:col-span-4 min-w-0">
                      <div className="font-semibold truncate">{r.clientName ?? "Client"}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.email ?? "—"}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Created: {fmtDate(r.createdAt)} • Reminders: {r.reminderCount}
                        {r.lastRemindedAt ? ` • Last: ${fmtDate(r.lastRemindedAt)}` : ""}
                      </div>
                    </div>

                    {/* Due */}
                    <div className="lg:col-span-2 text-sm">
                      <div className="font-semibold">{fmtDate(r.dueDate)}</div>
                      {outstanding ? (
                        <div className="text-xs text-muted-foreground">{outstanding} outstanding</div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No outstanding</div>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="lg:col-span-3 text-sm">
                      <div className="font-semibold">
                        {done}/{total} done
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Uploaded: {r.uploadedItems} • Waived: {r.waivedItems} • Requested: {r.requestedItems}
                      </div>

                      {/* Outstanding list */}
                      {show === "outstanding" && outstandingItems.length ? (
                        <div className="mt-2 rounded-2xl border bg-muted/20 p-3">
                          <div className="text-[11px] font-semibold text-muted-foreground mb-1">
                            Outstanding items
                          </div>
                          <ul className="space-y-1 text-xs">
                            {outstandingItems.slice(0, 6).map((it, i) => (
                              <li key={i} className="truncate">
                                • {it.label}
                              </li>
                            ))}
                            {outstandingItems.length > 6 ? (
                              <li className="text-[11px] text-muted-foreground">
                                +{outstandingItems.length - 6} more…
                              </li>
                            ) : null}
                          </ul>
                        </div>
                      ) : null}
                    </div>

                    {/* Request status */}
                    <div className="lg:col-span-1">
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-muted text-muted-foreground ring-border">
                        {r.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-2 lg:text-right">
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Link
                          href={`/admin/clients/${r.userId}/documents`}
                          className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                        >
                          Docs
                        </Link>
                        <Link
                          href={`/admin/clients/${r.userId}/documents/request?requestId=${encodeURIComponent(
                            r.requestId,
                          )}`}
                          className="rounded-xl bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90 transition"
                        >
                          Open request
                        </Link>
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
