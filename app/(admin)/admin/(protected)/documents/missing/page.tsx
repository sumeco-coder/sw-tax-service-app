// app/(admin)/admin/(protected)/documents/missing/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { sql, ilike, or, eq, type SQL } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users, documents } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MissingKey = "W2" | "1099" | "ID" | "PRIOR_RETURN";

const REQUIRED: { key: MissingKey; label: string; hint: string }[] = [
  { key: "ID", label: "Photo ID", hint: "driver license / ID / passport" },
  { key: "W2", label: "W-2", hint: "W-2 wage statements" },
  { key: "1099", label: "1099", hint: "1099-NEC / 1099-MISC / 1099-G ..." },
  { key: "PRIOR_RETURN", label: "Prior-year return", hint: "last year 1040/return" },
];

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

function normalizeName(name: string | null, email: string | null) {
  const n = (name ?? "").trim();
  if (n) return n;
  const e = (email ?? "").trim();
  if (!e) return "Client";
  return e.split("@")[0] ?? "Client";
}

function detectPresent(files: string[], key: MissingKey) {
  const hay = files.join(" ").toLowerCase();

  if (key === "W2") return /\bw-?2\b/.test(hay) || hay.includes("wage");
  if (key === "1099") return /\b1099\b/.test(hay);
  if (key === "ID")
    return (
      hay.includes("driver") ||
      hay.includes("license") ||
      hay.includes("dl") ||
      hay.includes("photo id") ||
      hay.includes("passport") ||
      /\bid\b/.test(hay)
    );
  if (key === "PRIOR_RETURN")
    return hay.includes("1040") || hay.includes("prior") || hay.includes("last year") || hay.includes("return");

  return false;
}

function pill(text: string, tone: "muted" | "danger" | "ok" = "muted") {
  const cls =
    tone === "ok"
      ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
      : tone === "danger"
      ? "bg-red-500/10 text-red-700 ring-red-500/20"
      : "bg-muted text-muted-foreground ring-border";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {text}
    </span>
  );
}

export default async function MissingDocsPage({
  searchParams,
}: {
  searchParams?: { q?: string; show?: "all" | "missingOnly" };
}) {
  const auth = await getServerRole();
  if (!auth) return redirect("/admin/sign-in");
  if (!isAdminRole(auth.role)) return redirect("/admin");

  const q = (searchParams?.q ?? "").trim();
  const show = (searchParams?.show ?? "missingOnly") as "all" | "missingOnly";

  const whereParts: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    whereParts.push(or(ilike(users.name, like), ilike(users.email, like))!);
  }

  // Aggregate filenames per user (DB-backed, no S3 scan)
  const base = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      onboardingStep: users.onboardingStep,
      lastSeenAt: users.lastSeenAt,
      files: sql<string[]>`
        coalesce(
          array_agg(${documents.fileName}) filter (where ${documents.fileName} is not null),
          '{}'::text[]
        )
      `.as("files"),
      fileCount: sql<number>`count(${documents.id})`.as("fileCount"),
    })
    .from(users)
    .leftJoin(documents, eq(documents.userId, users.id))
    .groupBy(users.id, users.name, users.email, users.onboardingStep, users.lastSeenAt);

  const rows = whereParts.length ? await base.where(sql.join(whereParts, sql` and `)) : await base;

  const scored = rows
    .map((r) => {
      const files = (r.files ?? []).map(String);
      const missing = REQUIRED.filter((req) => !detectPresent(files, req.key)).map((x) => x.key);
      return { ...r, files, missing };
    })
    .filter((r) => (show === "missingOnly" ? r.missing.length > 0 : true))
    .sort((a, b) => {
      // missing first, then most missing, then lastSeen desc
      if (a.missing.length === 0 && b.missing.length > 0) return 1;
      if (b.missing.length === 0 && a.missing.length > 0) return -1;
      if (b.missing.length !== a.missing.length) return b.missing.length - a.missing.length;
      const ad = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bd = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return bd - ad;
    });

  const hrefWith = (next: Partial<{ q: string; show: "all" | "missingOnly" }>) => {
    const p = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextShow = next.show ?? show;
    if (nextQ) p.set("q", nextQ);
    p.set("show", nextShow);
    return `/admin/documents/missing?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documents</p>
        <h1 className="text-2xl font-black tracking-tight">Missing tracker</h1>
        <p className="text-sm text-muted-foreground">
          Heuristic detection based on uploaded filenames (W-2, 1099, ID, prior return).
        </p>
      </div>

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 -mx-4 px-3 sm:px-4">
        <div className="rounded-3xl border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
          <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            <form method="GET" className="flex w-full items-center gap-2 lg:max-w-[620px]">
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

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-nowrap">
              <Link
                href={hrefWith({ show: "missingOnly" })}
                className={[
                  "h-10 inline-flex items-center justify-center rounded-2xl px-4 text-sm font-semibold ring-1 transition",
                  show === "missingOnly"
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-background text-foreground ring-border hover:bg-muted",
                ].join(" ")}
              >
                Missing only
              </Link>
              <Link
                href={hrefWith({ show: "all" })}
                className={[
                  "h-10 inline-flex items-center justify-center rounded-2xl px-4 text-sm font-semibold ring-1 transition",
                  show === "all"
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-background text-foreground ring-border hover:bg-muted",
                ].join(" ")}
              >
                Show all
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="hidden lg:grid grid-cols-12 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <div className="col-span-4">Client</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-3">Missing</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {scored.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">No results.</div>
        ) : (
          <ul className="divide-y">
            {scored.map((c) => {
              const display = normalizeName(c.name ?? null, c.email ?? null);
              const missing = c.missing as MissingKey[];

              return (
                <li key={c.id} className="px-4 py-4 hover:bg-muted/30 transition">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start">
                    <div className="lg:col-span-4 min-w-0">
                      <Link href={`/admin/clients/${c.id}/documents`} className="font-semibold hover:underline truncate block">
                        {display}
                      </Link>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Last active: {fmtLastActive(c.lastSeenAt ?? null)} • Files: {Number(c.fileCount ?? 0)}
                      </div>
                    </div>

                    <div className="lg:col-span-3 min-w-0 text-sm text-muted-foreground truncate">
                      {c.email ?? "—"}
                    </div>

                    <div className="lg:col-span-3">
                      <div className="flex flex-wrap gap-2">
                        {missing.length === 0
                          ? pill("No missing detected", "ok")
                          : missing.map((k) => pill(k, "danger"))}
                      </div>
                      {missing.length ? (
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          Tip: detection is filename-based — rename files if needed.
                        </div>
                      ) : null}
                    </div>

                    <div className="lg:col-span-2 flex flex-wrap gap-2 lg:justify-end">
                      <Link
                        href={`/admin/clients/${c.id}/documents`}
                        className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
                      >
                        Open docs
                      </Link>
                      <Link
                        href={`/admin/clients/${c.id}/documents/request`}
                        className="rounded-xl bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90 transition"
                      >
                        Request docs
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border bg-muted/30 p-4 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground mb-1">What counts as “present”?</div>
        <ul className="list-disc pl-5 space-y-1">
          {REQUIRED.map((r) => (
            <li key={r.key}>
              <span className="font-semibold">{r.label}:</span> {r.hint}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
