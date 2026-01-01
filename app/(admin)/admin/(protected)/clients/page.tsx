// app/(admin)/admin/(protected)/clients/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { sql, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";
import { StatusActions } from "./_components/StatusActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtLastActive(d: Date | null) {
  if (!d) return "Never";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtDateTime(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: "online" | "offline" | "all" };
}) {
  const auth = await getServerRole();
  if (!auth) return redirect("/admin/sign-in");

  const isAdmin =
    auth.role === "ADMIN" ||
    auth.role === "LMS_ADMIN" ||
    auth.role === "LMS_PREPARER";
  if (!isAdmin) return redirect("/admin");

  const q = (searchParams?.q ?? "").trim();
  const presence = (searchParams?.status ?? "all") as "all" | "online" | "offline";

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

  const base = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,

      status: users.status,
      disabledReason: users.disabledReason,

      lastSeenAt: users.lastSeenAt,
      isOnline: sql<boolean>`
        coalesce(${users.lastSeenAt} > now() - interval '5 minutes', false)
      `.as("isOnline"),
    })
    .from(users);

  const orderByLastSeen = sql`${users.lastSeenAt} desc nulls last`;

  const rows = whereParts.length
    ? await base.where(sql.join(whereParts, sql` and `)).orderBy(orderByLastSeen)
    : await base.orderBy(orderByLastSeen);

  const onlineCount = rows.reduce((acc, r) => acc + (r.isOnline ? 1 : 0), 0);

  const hrefWith = (status: "all" | "online" | "offline") => {
    const params = new URLSearchParams();
    params.set("status", status);
    if (q) params.set("q", q);
    return `/admin/clients?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-black">Clients</h1>
          <p className="text-sm text-black/60">
            Total: {rows.length} • Online now: {onlineCount}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {/* Search */}
          <form className="flex items-center gap-2" method="GET">
            <input type="hidden" name="status" value={presence} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name or email..."
              className="w-full sm:w-64 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
            <button className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5 transition">
              Search
            </button>
          </form>

          {/* Presence filters */}
          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            <Link
              href={hrefWith("all")}
              className={`rounded-2xl border px-3 py-2 text-sm transition ${
                presence === "all"
                  ? "bg-black text-white border-black"
                  : "bg-white border-black/10 hover:bg-black/5"
              }`}
            >
              All
            </Link>
            <Link
              href={hrefWith("online")}
              className={`rounded-2xl border px-3 py-2 text-sm transition ${
                presence === "online"
                  ? "bg-black text-white border-black"
                  : "bg-white border-black/10 hover:bg-black/5"
              }`}
            >
              Online
            </Link>
            <Link
              href={hrefWith("offline")}
              className={`rounded-2xl border px-3 py-2 text-sm transition ${
                presence === "offline"
                  ? "bg-black text-white border-black"
                  : "bg-white border-black/10 hover:bg-black/5"
              }`}
            >
              Offline
            </Link>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 bg-black/5 px-4 py-2 text-xs font-semibold text-black/70">
          <div className="col-span-3">Client</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Account</div>
          <div className="col-span-1">Presence</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        {rows.map((c) => {
          const accountLabel = c.status === "disabled" ? "Disabled" : "Active";
          const accountTitle =
            c.status === "disabled"
              ? `Disabled${c.disabledReason ? `: ${c.disabledReason}` : ""}`
              : "Active";

          return (
            <div
              key={c.id}
              className="border-t border-black/10 px-4 py-3 hover:bg-black/5 transition-colors group"
            >
              {/* Mobile */}
              <div className="md:hidden space-y-2">
                <div className="min-w-0">
                  <Link
                    href={`/admin/clients/${c.id}/edit`}
                    className="font-medium text-black hover:underline truncate block"
                  >
                    {c.name ?? "Client"}
                  </Link>
                  <div className="text-xs text-black/60 truncate">{c.email ?? "—"}</div>
                  <div className="text-[11px] text-black/45">
                    Last active: {fmtLastActive(c.lastSeenAt ?? null)} •{" "}
                    {fmtDateTime(c.lastSeenAt ?? null)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    title={accountTitle}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition cursor-default group-hover:ring-1 group-hover:ring-black/10 ${
                      c.status === "disabled"
                        ? "bg-red-100 text-red-800 hover:bg-red-200"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }`}
                  >
                    {accountLabel}
                  </span>

                  <span
                    title={c.isOnline ? "Online now (last 5 minutes)" : "Offline"}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition cursor-default group-hover:ring-1 group-hover:ring-black/10 ${
                      c.isOnline
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {c.isOnline ? "Online" : "Offline"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/clients/${c.id}/documents`}
                    className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs hover:bg-black/5 transition whitespace-nowrap"
                  >
                    Docs
                  </Link>

                  <Link
                    href={`/admin/clients/${c.id}/messages`}
                    className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs hover:bg-black/5 transition whitespace-nowrap"
                  >
                    Messages
                  </Link>

                  <Link
                    href={`/admin/clients/${c.id}/edit`}
                    className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs hover:bg-black/5 transition whitespace-nowrap"
                  >
                    Edit
                  </Link>

                  <StatusActions
                    userId={c.id}
                    status={c.status}
                    disabledReason={c.disabledReason}
                  />
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden md:grid grid-cols-12 items-center gap-4">
                <div className="col-span-3 min-w-0">
                  <Link
                    href={`/admin/clients/${c.id}/edit`}
                    className="font-medium text-black hover:underline truncate block"
                  >
                    {c.name ?? "Client"}
                  </Link>
                  <div className="text-[11px] text-black/45 truncate">
                    Last active: {fmtLastActive(c.lastSeenAt ?? null)} •{" "}
                    {fmtDateTime(c.lastSeenAt ?? null)}
                  </div>
                </div>

                <div className="col-span-3 min-w-0 text-black/70 truncate">{c.email ?? "—"}</div>

                <div className="col-span-2">
                  <span
                    title={accountTitle}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition cursor-default group-hover:ring-1 group-hover:ring-black/10 ${
                      c.status === "disabled"
                        ? "bg-red-100 text-red-800 hover:bg-red-200"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }`}
                  >
                    {accountLabel}
                  </span>
                </div>

                <div className="col-span-1">
                  <span
                    title={c.isOnline ? "Online now (last 5 minutes)" : "Offline"}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition cursor-default group-hover:ring-1 group-hover:ring-black/10 ${
                      c.isOnline
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {c.isOnline ? "Online" : "Offline"}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-3 flex items-center justify-end gap-2 flex-wrap">
                  <Link
                    href={`/admin/clients/${c.id}/documents`}
                    className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs hover:bg-black/5 transition whitespace-nowrap"
                  >
                    Docs
                  </Link>

                  <Link
                    href={`/admin/clients/${c.id}/messages`}
                    className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs hover:bg-black/5 transition whitespace-nowrap"
                  >
                    Messages
                  </Link>

                  <Link
                    href={`/admin/clients/${c.id}/edit`}
                    className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs hover:bg-black/5 transition whitespace-nowrap"
                  >
                    Edit
                  </Link>

                  <StatusActions
                    userId={c.id}
                    status={c.status}
                    disabledReason={c.disabledReason}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="px-4 py-6 text-sm text-black/60">No clients found.</div>
        )}
      </div>
    </div>
  );
}
