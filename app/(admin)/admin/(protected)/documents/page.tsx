import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { users, documents } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";
import { Search, Inbox, FileText, ArrowRight } from "lucide-react";
import { and, desc, eq, sql } from "drizzle-orm";

import DocRowActions from "./_components/DocRowActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StatusKey = "new" | "reviewed" | "needs_attention";

type DocRow = {
  id: string;
  userId: string;
  clientName: string | null;
  email: string | null;
  taxYear: number | null;
  docType: string | null;
  fileName: string | null;
  displayName: string | null;
  createdAt: string;
  status: StatusKey;
  attentionNote: string | null;
};

function pill(status: StatusKey) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1";
  if (status === "new")
    return (
      <span className={`${base} bg-blue-500/10 text-blue-700 ring-blue-500/20`}>
        New
      </span>
    );
  if (status === "needs_attention")
    return (
      <span className={`${base} bg-red-500/10 text-red-700 ring-red-500/20`}>
        Needs attention
      </span>
    );
  return (
    <span className={`${base} bg-emerald-500/10 text-emerald-700 ring-emerald-500/20`}>
      Reviewed
    </span>
  );
}

function escapeLike(s: string) {
  // escape %, _, and backslash for LIKE ... ESCAPE '\'
  return s.replace(/[%_\\]/g, "\\$&");
}

export default async function AdminDocumentsInboxPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string };
}) {
  const auth = await getServerRole();
  if (!auth?.sub) return redirect("/admin/sign-in");

  const isAdmin =
    auth.role === "ADMIN" ||
    auth.role === "SUPERADMIN" ||
    auth.role === "LMS_ADMIN" ||
    auth.role === "LMS_PREPARER";

  if (!isAdmin) return redirect("/admin");

  const q = (searchParams?.q ?? "").trim();
  const rawStatus = (searchParams?.status ?? "all").trim();

  const allowedStatuses = new Set(["all", "new", "reviewed", "needs_attention"]);
  const status = (allowedStatuses.has(rawStatus) ? rawStatus : "all") as
    | "all"
    | StatusKey;

  const hrefWith = (next: Partial<{ q: string; status: string }>) => {
    const params = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextStatus = next.status ?? status;
    if (nextQ) params.set("q", nextQ);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    const s = params.toString();
    return s ? `/admin/documents?${s}` : "/admin/documents";
  };

  // preserve current filters after action submits
  const returnTo = hrefWith({});

  // --- Base WHERE (search only) ---
  const baseConds: any[] = [];

  if (q) {
    const like = `%${escapeLike(q)}%`;
    baseConds.push(sql`
      (
        lower(${users.email}) like lower(${like}) escape '\\'
        or lower(coalesce(${users.name}, '')) like lower(${like}) escape '\\'
        or lower(coalesce(${users.firstName}, '')) like lower(${like}) escape '\\'
        or lower(coalesce(${users.lastName}, '')) like lower(${like}) escape '\\'
      )
    `);
  }

  const baseWhere = baseConds.length ? and(...baseConds) : undefined;

  // --- List WHERE (search + status filter) ---
  const listConds = [...baseConds];
  if (status !== "all") {
    listConds.push(eq(documents.status as any, status as any));
  }
  const listWhere = listConds.length ? and(...listConds) : undefined;

  // --- Counts (based on search only; not locked to status filter) ---
  const [countsRow] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      new: sql<number>`count(*) filter (where ${documents.status} = 'new')`.mapWith(
        Number,
      ),
      reviewed: sql<number>`count(*) filter (where ${documents.status} = 'reviewed')`.mapWith(
        Number,
      ),
      needs: sql<number>`count(*) filter (where ${documents.status} = 'needs_attention')`.mapWith(
        Number,
      ),
    })
    .from(documents)
    .innerJoin(users, eq(users.id, documents.userId))
    .where(baseWhere);

  const counts = {
    total: countsRow?.total ?? 0,
    new: countsRow?.new ?? 0,
    reviewed: countsRow?.reviewed ?? 0,
    needs: countsRow?.needs ?? 0,
  };

  // --- Rows (search + status filter) ---
  const raw = await db
    .select({
      id: documents.id,
      userId: documents.userId,
      email: users.email,
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
      taxYear: documents.taxYear,
      docType: documents.docType,
      fileName: documents.fileName,
      displayName: documents.displayName,
      createdAt: documents.uploadedAt,
      status: documents.status as any,
      attentionNote: documents.attentionNote as any,
    })
    .from(documents)
    .innerJoin(users, eq(users.id, documents.userId))
    .where(listWhere)
    .orderBy(desc(documents.uploadedAt))
    .limit(200);

  const rows: DocRow[] = raw.map((r) => ({
    id: String(r.id),
    userId: String(r.userId),
    clientName: r.clientName ? String(r.clientName) : null,
    email: r.email ? String(r.email) : null,
    taxYear: r.taxYear == null ? null : Number(r.taxYear),
    docType: r.docType ? String(r.docType) : null,
    fileName: r.fileName ? String(r.fileName) : null,
    displayName: r.displayName ? String(r.displayName) : null,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : new Date(r.createdAt as any).toISOString(),
    status: (String(r.status) as StatusKey) ?? "new",
    attentionNote: r.attentionNote ? String(r.attentionNote) : null,
  }));

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
          <Inbox className="h-4 w-4" />
          Documents
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Inbox</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Total: {counts.total} • New: {counts.new} • Reviewed:{" "}
              {counts.reviewed} • Needs attention: {counts.needs}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin/documents/missing"
              className="h-10 inline-flex items-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
            >
              Missing tracker <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin/documents/requests"
              className="h-10 inline-flex items-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
            >
              Request center <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky bar */}
      <div className="sticky top-0 z-20 -mx-4 px-3 sm:px-4">
        <div className="rounded-3xl border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
          <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <form
              className="flex w-full items-center gap-2 lg:max-w-[560px]"
              method="GET"
            >
              <input type="hidden" name="status" value={status} />
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search client or email…"
                  className="h-10 w-full rounded-2xl border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
                />
              </div>
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

            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-nowrap">
              {filterBtn("All", "all")}
              {filterBtn("New", "new")}
              {filterBtn("Reviewed", "reviewed")}
              {filterBtn("Needs", "needs_attention")}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="hidden lg:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <div className="col-span-4">Client</div>
          <div className="col-span-3">Doc</div>
          <div className="col-span-2">Year</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">
            No documents yet. New uploads will appear here.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((d) => {
              const docName = d.displayName ?? d.fileName ?? null;

              return (
                <li
                  key={d.id}
                  className="px-4 py-4 hover:bg-muted/30 transition"
                >
                  <div className="flex flex-col gap-2 lg:grid lg:grid-cols-12 lg:items-center">
                    <div className="lg:col-span-4 min-w-0">
                      <div className="font-semibold truncate">
                        {d.clientName ?? "Client"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.email ?? "—"}
                      </div>
                    </div>

                    <div className="lg:col-span-3 text-sm text-muted-foreground flex items-start gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="truncate">{d.docType ?? "Document"}</div>
                        {docName ? (
                          <div className="text-xs text-muted-foreground/80 truncate">
                            {docName}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="lg:col-span-2 text-sm">{d.taxYear ?? "—"}</div>

                    <div className="lg:col-span-2">{pill(d.status)}</div>

                    {/* ✅ Actions (modal-based Needs) */}
                    <div className="lg:col-span-1 lg:text-right">
                      <DocRowActions
                        docId={d.id}
                        userId={d.userId}
                        status={d.status}
                        attentionNote={d.attentionNote}
                        returnTo={returnTo}
                      />
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
