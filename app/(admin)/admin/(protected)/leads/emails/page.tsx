import { db } from "@/drizzle/db";
import { emailLeads } from "@/drizzle/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function EmailLeadsAdminPage({
  searchParams,
}: {
  searchParams: { q?: string; source?: string; optin?: string };
}) {
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const source = (searchParams.source ?? "").trim();
  const optin = searchParams.optin === "1";

  const where = and(
    q
      ? or(
          ilike(emailLeads.emailLower, `%${q}%`),
          ilike(emailLeads.email, `%${q}%`),
          ilike(emailLeads.source, `%${q}%`)
        )
      : undefined,
    source ? eq(emailLeads.source, source) : undefined,
    optin ? eq(emailLeads.marketingOptIn, true) : undefined
  );

  const rows = await db
    .select()
    .from(emailLeads)
    .where(where)
    .orderBy(desc(emailLeads.lastSeenAt))
    .limit(500);

  // pull distinct sources for dropdown (simple + safe)
  const sourceRows = await db
    .select({ source: emailLeads.source })
    .from(emailLeads)
    .groupBy(emailLeads.source)
    .orderBy(emailLeads.source)
    .limit(200);

  const sources = sourceRows.map((r) => r.source);

  const csvQs = new URLSearchParams();
  if (searchParams.q) csvQs.set("q", searchParams.q);
  if (searchParams.source) csvQs.set("source", searchParams.source);
  if (searchParams.optin) csvQs.set("optin", searchParams.optin);

  return (
    <div className="p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Email Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Universal email captures (newsletter, waitlist, contact forms, lead magnets).
          </p>
        </div>

        <a
          className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
          href={`/api/admin/leads/email-leads.csv?${csvQs.toString()}`}
        >
          Export CSV
        </a>
      </div>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap" method="get">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search email/source…"
          className="h-10 w-full rounded-md border px-3 text-sm sm:w-72"
        />

        <select
          name="source"
          defaultValue={source}
          className="h-10 rounded-md border px-3 text-sm sm:w-56"
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="optin" value="1" defaultChecked={optin} />
          Opt-in only
        </label>

        <button className="h-10 rounded-md border px-4 text-sm font-medium">
          Filter
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-2xl border bg-background/80 shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Opt-in</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Submit count</th>
              <th className="p-3 text-left">First seen</th>
              <th className="p-3 text-left">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-3">{r.email}</td>
                <td className="p-3">{r.marketingOptIn ? "Yes" : "No"}</td>
                <td className="p-3">{r.source}</td>
                <td className="p-3">{r.submitCount}</td>
                <td className="p-3">
                  {new Date(r.firstSeenAt as any).toLocaleString("en-US")}
                </td>
                <td className="p-3">
                  {new Date(r.lastSeenAt as any).toLocaleString("en-US")}
                </td>
              </tr>
            ))}

            {!rows.length ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  No email leads yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Showing {rows.length} rows (max 500).
      </p>
    </div>
  );
}
