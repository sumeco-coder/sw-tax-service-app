// app/(admin)/admin/(protected)/clients/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { sql, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

import { StatusActions } from "./_components/StatusActions";
import SortSelect from "./_components/SortSelect";

import { Search, Users as UsersIcon, CircleDot, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
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

function fmtDateTime(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
}

function clientHref(userId: string, slug: string) {
  return `/admin/clients/${userId}/${slug}`;
}

const CURRENT_TAX_YEAR = new Date().getFullYear();

function returnEditorHref(userId: string, year = CURRENT_TAX_YEAR) {
  return `/admin/returns/${userId}?year=${year}`;
}
type Presence = "all" | "online" | "offline";
type SortKey = "lastActive" | "name" | "onboarding";

const PRESENCE: Presence[] = ["all", "online", "offline"];
const SORTS: SortKey[] = ["lastActive", "name", "onboarding"];

function normalizePresence(v: unknown): Presence {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return (PRESENCE as string[]).includes(s) ? (s as Presence) : "all";
}

function normalizeSort(v: unknown): SortKey {
  const s = String(v ?? "").trim();
  return (SORTS as string[]).includes(s) ? (s as SortKey) : "lastActive";
}

function presencePill(isOnline: boolean) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        isOnline
          ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
          : "bg-muted text-muted-foreground ring-border",
      ].join(" ")}
      title={isOnline ? "Online now (last 5 minutes)" : "Offline"}
    >
      <CircleDot className="h-3.5 w-3.5" />
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}

function accountPill(status: any, disabledReason?: string | null) {
  const disabled = status === "disabled";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        disabled
          ? "bg-red-500/10 text-red-700 ring-red-500/20"
          : "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
      ].join(" ")}
      title={
        disabled
          ? `Disabled${disabledReason ? `: ${disabledReason}` : ""}`
          : "Active"
      }
    >
      {disabled ? "Disabled" : "Active"}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Onboarding progress (PROFILE → … → DONE)
───────────────────────────────────────────── */
const ONBOARDING_ORDER = [
  "PROFILE",
  "DOCUMENTS",
  "QUESTIONS",
  "SCHEDULE",
  "SUMMARY",
  "AGREEMENTS",
  "SUBMITTED",
  "DONE",
] as const;

function normalizeStep(step: unknown) {
  const s = String(step ?? "").toUpperCase();
  return (ONBOARDING_ORDER as readonly string[]).includes(s) ? s : "PROFILE";
}

function stepIndex(step: unknown) {
  const s = normalizeStep(step);
  return Math.max(0, ONBOARDING_ORDER.indexOf(s as any));
}

function onboardingPill(step: unknown) {
  const s = normalizeStep(step);
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1";

  if (s === "DONE") {
    return (
      <span
        className={`${base} bg-emerald-500/10 text-emerald-700 ring-emerald-500/20`}
      >
        DONE
      </span>
    );
  }
  if (s === "SUBMITTED") {
    return (
      <span className={`${base} bg-blue-500/10 text-blue-700 ring-blue-500/20`}>
        SUBMITTED
      </span>
    );
  }
  return (
    <span className={`${base} bg-muted text-muted-foreground ring-border`}>
      {s}
    </span>
  );
}

function OnboardingProgress({ step }: { step: unknown }) {
  const s = normalizeStep(step);
  const idx = stepIndex(s);
  const total = ONBOARDING_ORDER.length;
  const percent = Math.round((idx / (total - 1)) * 100);

  const label =
    s === "DONE"
      ? "Onboarding complete"
      : s === "SUBMITTED"
        ? "Onboarding submitted"
        : `Onboarding: ${s.replaceAll("_", " ")}`;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>

      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted ring-1 ring-border">
        <div
          className="h-full rounded-full bg-foreground/80"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-1 text-[11px] text-muted-foreground">
        Step {Math.min(idx + 1, total)} of {total}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: Presence; sort?: SortKey };
}) {
  const auth = await getServerRole();
  if (!auth) return redirect("/admin/sign-in");

  const isAdmin =
    auth.role === "ADMIN" ||
    auth.role === "SUPERADMIN" ||
    auth.role === "LMS_ADMIN" ||
    auth.role === "LMS_PREPARER";

  if (!isAdmin) return redirect("/admin");

  const q = (searchParams?.q ?? "").trim();
  const presence = normalizePresence(searchParams?.status ?? "all");
  const sort = normalizeSort(searchParams?.sort ?? "lastActive");

  const whereParts: SQL[] = [];

  if (q) {
    const like = `%${q}%`;
    whereParts.push(or(ilike(users.name, like), ilike(users.email, like))!);
  }

  if (presence === "online") {
    whereParts.push(sql`${users.lastSeenAt} > now() - interval '5 minutes'`);
  }
  if (presence === "offline") {
    whereParts.push(
      or(
        sql`${users.lastSeenAt} <= now() - interval '5 minutes'`,
        sql`${users.lastSeenAt} is null`
      )!
    );
  }

  const orderBySql =
    sort === "name"
      ? sql`${users.name} asc nulls last, ${users.email} asc nulls last`
      : sort === "onboarding"
        ? sql`
          case ${users.onboardingStep}
            when 'PROFILE' then 1
            when 'DOCUMENTS' then 2
            when 'QUESTIONS' then 3
            when 'SCHEDULE' then 4
            when 'SUMMARY' then 5
            when 'AGREEMENTS' then 6
            when 'SUBMITTED' then 7
            when 'DONE' then 8
            else 1
          end asc,
          ${users.lastSeenAt} desc nulls last
        `
        : sql`${users.lastSeenAt} desc nulls last`;

  const base = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      disabledReason: users.disabledReason,
      onboardingStep: users.onboardingStep,
      lastSeenAt: users.lastSeenAt,
      isOnline: sql<boolean>`
        coalesce(${users.lastSeenAt} > now() - interval '5 minutes', false)
      `.as("isOnline"),
    })
    .from(users);

  const rows = whereParts.length
    ? await base.where(sql.join(whereParts, sql` and `)).orderBy(orderBySql)
    : await base.orderBy(orderBySql);

  const onlineCount = rows.reduce((acc, r) => acc + (r.isOnline ? 1 : 0), 0);

  const hrefWith = (
    next: Partial<{ status: Presence; q: string; sort: SortKey }>
  ) => {
    const params = new URLSearchParams();

    const nextStatus = next.status ?? presence;
    const nextQ = next.q ?? q;
    const nextSort = next.sort ?? sort;

    params.set("status", nextStatus);
    params.set("sort", nextSort);
    if (nextQ) params.set("q", nextQ);

    const s = params.toString();
    return s ? `/admin/clients?${s}` : "/admin/clients";
  };

  const filterBtn = (label: string, status: Presence) => {
    const active = presence === status;
    return (
      <Link
        href={hrefWith({ status })}
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
      {/* Top header */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <UsersIcon className="h-4 w-4" />
          Admin
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Clients</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Total: {rows.length} • Online now: {onlineCount}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Search / Filters / Sort */}
      <div className="sticky top-0 z-20 -mx-4 px-3 sm:px-4">
        <div className="rounded-3xl border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
          {/* ✅ lg: keeps tablets stacked so it doesn't wrap weird */}
          <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <form
              className="flex w-full items-center gap-2 lg:max-w-[560px]"
              method="GET"
            >
              <input type="hidden" name="status" value={presence} />
              <input type="hidden" name="sort" value={sort} />

              <div className="relative flex-1 min-w-[180px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search name or email…"
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

            {/* Filters + Sort */}
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:justify-end">
              {/* ✅ Pills become a grid on small screens (no wrap mess) */}
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-nowrap">
                {filterBtn("All", "all")}
                {filterBtn("Online", "online")}
                {filterBtn("Offline", "offline")}
              </div>

              {/* ✅ Sort has consistent width */}
              <div className="w-full sm:w-[240px]">
                <SortSelect value={sort} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        {/* Desktop header */}
        <div className="hidden lg:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <div className="col-span-4">Client</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Presence</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">
            No clients found.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((c) => (
              <li key={c.id} className="px-4 py-4 hover:bg-muted/30 transition">
                {/* Mobile / Tablet */}
                <div className="lg:hidden space-y-3">
                  <div className="min-w-0">
                    <Link
                      href={clientHref(c.id, "edit")}
                      className="font-semibold hover:underline truncate block"
                    >
                      {c.name ?? "Client"}
                    </Link>

                    <div className="text-xs text-muted-foreground truncate">
                      {c.email ?? "—"}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {accountPill(c.status, c.disabledReason)}
                      {presencePill(Boolean(c.isOnline))}
                      {onboardingPill(c.onboardingStep)}
                    </div>

                    <OnboardingProgress step={c.onboardingStep} />

                    <div className="text-[11px] text-muted-foreground mt-2">
                      Last active: {fmtLastActive(c.lastSeenAt ?? null)} •{" "}
                      {fmtDateTime(c.lastSeenAt ?? null)}
                    </div>
                  </div>

                  {/* ✅ Actions as a grid (cleaner than wrap) */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {/* ✅ NEW Return button */}
                    <Link
                      href={returnEditorHref(c.id)}
                      className="inline-flex h-9 w-full items-center justify-center rounded-xl border bg-background px-3 text-xs font-semibold hover:bg-muted transition"
                    >
                      Return
                    </Link>

                    {[
                      ["Docs", "documents"],
                      ["Dependents", "dependents"],
                      ["Business", "business"],
                      ["Notices", "notices"],
                      ["Next steps", "next-steps"],
                      ["Messages", "messages"],
                      ["Edit", "edit"],
                    ].map(([label, slug]) => (
                      <Link
                        key={slug}
                        href={clientHref(c.id, slug)}
                        className="inline-flex h-9 w-full items-center justify-center rounded-xl border bg-background px-3 text-xs font-semibold hover:bg-muted transition"
                      >
                        {label}
                      </Link>
                    ))}

                    <div className="col-span-2 sm:col-span-3">
                      <StatusActions
                        userId={c.id}
                        status={c.status}
                        disabledReason={c.disabledReason}
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop */}
                <div className="hidden lg:grid grid-cols-12 items-start gap-4">
                  <div className="col-span-4 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link
                        href={clientHref(c.id, "edit")}
                        className="font-semibold hover:underline truncate"
                      >
                        {c.name ?? "Client"}
                      </Link>
                      {onboardingPill(c.onboardingStep)}
                    </div>

                    <div className="text-[11px] text-muted-foreground truncate mt-1">
                      Last active: {fmtLastActive(c.lastSeenAt ?? null)} •{" "}
                      {fmtDateTime(c.lastSeenAt ?? null)}
                    </div>

                    <OnboardingProgress step={c.onboardingStep} />
                  </div>

                  <div className="col-span-3 min-w-0 text-sm text-muted-foreground truncate pt-1">
                    {c.email ?? "—"}
                  </div>

                  <div className="col-span-2 flex flex-wrap gap-2 pt-1">
                    {accountPill(c.status, c.disabledReason)}
                  </div>

                  <div className="col-span-1 pt-1">
                    {presencePill(Boolean(c.isOnline))}
                  </div>

                  <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 pt-1">
                    <Link
                      href={clientHref(c.id, "documents")}
                      className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                    >
                      Docs
                    </Link>

                    <Link
                      href={clientHref(c.id, "business")}
                      className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                    >
                      Business
                    </Link>

                    <Link
                      href={clientHref(c.id, "dependents")}
                      className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                    >
                      Dependents
                    </Link>

                    <Link
                      href={clientHref(c.id, "next-steps")}
                      className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                    >
                      Next
                    </Link>

                    <Link
                      href={clientHref(c.id, "edit")}
                      className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                    >
                      Edit
                    </Link>

                    <Link
                      href={returnEditorHref(c.id)}
                      className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                    >
                      Return
                    </Link>

                    <StatusActions
                      userId={c.id}
                      status={c.status}
                      disabledReason={c.disabledReason}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Footer tip */}
        <div className="border-t bg-muted/40 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Tip: use “Next steps” to track what the client still owes (docs,
          signatures, payment).
        </div>
      </div>
    </div>
  );
}
