// app/(admin)/admin/(protected)/returns/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { taxReturns, users } from "@/drizzle/schema";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function money(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(String(v));
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function ymd(v: unknown) {
  if (!v) return "—";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

const STATUSES = [
  "ALL",
  "PENDING",
  "DRAFT",
  "IN_REVIEW",
  "FILED",
  "ACCEPTED",
  "REJECTED",
  "AMENDED",
] as const;

type StatusFilter = (typeof STATUSES)[number];

const CURRENT_TAX_YEAR = new Date().getFullYear();
function returnEditorHref(userId: string, year = CURRENT_TAX_YEAR) {
  return `/admin/returns/${userId}?year=${year}`;
}

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams?: { year?: string; status?: string; q?: string };
}) {
  // ✅ Admin-only gate
  const me = await getServerRole();
  if (!me?.sub) redirect("/admin/sign-in");

  const role = String(me?.role ?? "").toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin";
  if (!isAdmin) redirect("/not-authorized");

  const currentYear = new Date().getFullYear();

  const yearNum = Number(searchParams?.year ?? currentYear);
  const year = Number.isFinite(yearNum) ? yearNum : currentYear;

  const statusRaw = String(searchParams?.status ?? "ALL").toUpperCase();
  const status = (STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as StatusFilter)
    : ("ALL" as const);

  const q = String(searchParams?.q ?? "").trim();

  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const whereParts: SQL[] = [eq(taxReturns.taxYear, year)];

  if (status !== "ALL") {
    // NOTE: must exist in DB enum
    whereParts.push(eq(taxReturns.status, status as any));
  }

  if (q) {
    whereParts.push(
      or(
        ilike(users.email, `%${q}%`),
        ilike(users.name, `%${q}%`),
        ilike(users.cognitoSub, `%${q}%`)
      )!
    );
  }

  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      cognitoSub: users.cognitoSub,
      taxYear: taxReturns.taxYear,
      status: taxReturns.status,
      refundAmount: taxReturns.refundAmount,
      refundEta: taxReturns.refundEta,
      createdAt: taxReturns.createdAt,
    })
    .from(taxReturns)
    .innerJoin(users, eq(users.id, taxReturns.userId))
    .where(and(...whereParts))
    .orderBy(desc(taxReturns.taxYear), desc(taxReturns.createdAt))
    .limit(80);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Returns</h1>
          <p className="text-sm text-muted-foreground">
            Update status, estimated refund, and ETA.
          </p>
        </div>

        <Link
          href="/admin/clients"
          className="inline-flex items-center justify-center rounded-xl border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          View clients
        </Link>
      </div>

      {/* Filters */}
      <form className="rounded-2xl border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Tax year
            </label>
            <select
              name="year"
              defaultValue={String(year)}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Search (name / email / cognitoSub)
            </label>
            <input
              name="q"
              defaultValue={q}
              placeholder="e.g. client@email.com"
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            Apply
          </button>
          <Link
            href="/admin/returns"
            className="rounded-xl border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
          >
            Reset
          </Link>
        </div>
      </form>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 gap-2 border-b bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <div className="col-span-4">Client</div>
          <div className="col-span-1">Year</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Refund</div>
          <div className="col-span-2">ETA</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No returns found for those filters.
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={`${r.userId}-${r.taxYear}`}>
                {/* ✅ Mobile card */}
                <div className="md:hidden px-4 py-4 space-y-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {r.name ?? "Client"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.email ?? "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {r.cognitoSub}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-[11px] text-muted-foreground">Year</div>
                      <div className="font-medium">{r.taxYear}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Status</div>
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                        {String(r.status)}
                      </span>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Refund</div>
                      <div className="font-medium">{money(r.refundAmount)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">ETA</div>
                      <div className="font-medium">{ymd(r.refundEta)}</div>
                    </div>
                  </div>

                  <Link
                    href={returnEditorHref(r.userId, r.taxYear)}
                    className="inline-flex w-full items-center justify-center rounded-xl border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted"
                  >
                    Update
                  </Link>
                </div>

                {/* ✅ Desktop row */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                  <div className="col-span-4 min-w-0">
                    <div className="font-medium truncate">{r.email}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.cognitoSub}
                    </div>
                  </div>

                  <div className="col-span-1">{r.taxYear}</div>

                  <div className="col-span-2">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                      {String(r.status)}
                    </span>
                  </div>

                  <div className="col-span-2">{money(r.refundAmount)}</div>

                  <div className="col-span-2">{ymd(r.refundEta)}</div>

                  <div className="col-span-1 text-right">
                    <Link
                      href={returnEditorHref(r.userId, r.taxYear)}
                      className="inline-flex items-center justify-center rounded-xl border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted"
                    >
                      Update
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Clicking <b>Update</b> routes to{" "}
        <code>/admin/returns/[userId]?year=YYYY</code> where you enter refund
        estimate/status/ETA.
      </p>
    </div>
  );
}
