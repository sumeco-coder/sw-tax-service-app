import Link from "next/link";
import { db } from "@/drizzle/db";
import { taxCalculatorLeads } from "@/drizzle/schema";
import { and, desc, eq, ilike, isNotNull, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

type Estimate = {
  type?: "refund" | "owe";
  amount?: number;
  totalTax?: number;
  selfEmploymentTax?: number;
  quarterlyPayment?: number;
};

export default async function TaxCalculatorLeadsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    optin?: string;
    paid?: string;
    unlocked?: string;
    type?: string; // refund | owe
    min?: string; // number
    requiresQuarterly?: string; // 1
  };
}) {
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const optin = searchParams.optin === "1";
  const paid = searchParams.paid === "1";
  const unlocked = searchParams.unlocked === "1";

  const typeFilter =
    searchParams.type === "refund" || searchParams.type === "owe"
      ? (searchParams.type as "refund" | "owe")
      : "";

  const minAmount = Math.max(0, Number(searchParams.min ?? 0) || 0);
  const requiresQuarterly = searchParams.requiresQuarterly === "1";

  const where = and(
    q
      ? or(
          ilike(taxCalculatorLeads.emailLower, `%${q}%`),
          ilike(taxCalculatorLeads.email, `%${q}%`),
          ilike(taxCalculatorLeads.source, `%${q}%`)
        )
      : undefined,
    optin ? eq(taxCalculatorLeads.marketingOptIn, true) : undefined,
    unlocked ? eq(taxCalculatorLeads.taxPlanUnlocked, true) : undefined,
    paid ? isNotNull(taxCalculatorLeads.paidAt) : undefined
  );

  // Pull more than you need, then filter in memory (JSON estimate lives in snapshot)
  const rawRows = await db
    .select()
    .from(taxCalculatorLeads)
    .where(where)
    .orderBy(desc(taxCalculatorLeads.updatedAt))
    .limit(1000);

  const rows = rawRows
    .map((r) => {
      const est = (r.snapshot as any)?.estimate as Estimate | undefined;
      return { r, est };
    })
    .filter(({ est }) => {
      if (!typeFilter && !minAmount && !requiresQuarterly) return true;

      const typeOk = typeFilter ? est?.type === typeFilter : true;

      const amt = typeof est?.amount === "number" ? Math.abs(est.amount) : 0;
      const minOk = minAmount ? amt >= minAmount : true;

      const qp = typeof est?.quarterlyPayment === "number" ? est.quarterlyPayment : 0;
      const quarterlyOk = requiresQuarterly ? qp > 0 : true;

      return typeOk && minOk && quarterlyOk;
    })
    .slice(0, 300);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Tax Calculator Leads</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Emails captured from tax-calculator completions.
      </p>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap" method="get">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search email/source…"
          className="h-10 w-full rounded-md border px-3 text-sm sm:w-64"
        />

        <select
          name="type"
          defaultValue={typeFilter || ""}
          className="h-10 rounded-md border px-3 text-sm"
        >
          <option value="">All types</option>
          <option value="refund">Refund</option>
          <option value="owe">Owe</option>
        </select>

        <input
          name="min"
          defaultValue={searchParams.min ?? ""}
          placeholder="Min amount (e.g. 2000)"
          inputMode="numeric"
          className="h-10 w-full rounded-md border px-3 text-sm sm:w-48"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="requiresQuarterly"
            value="1"
            defaultChecked={requiresQuarterly}
          />
          Quarterly only
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="optin" value="1" defaultChecked={optin} />
          Opt-in only
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="unlocked" value="1" defaultChecked={unlocked} />
          Unlocked
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="paid" value="1" defaultChecked={paid} />
          Paid
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
              <th className="p-3 text-left">Estimate</th>
              <th className="p-3 text-left">Quarterly</th>
              <th className="p-3 text-left">Opt-in</th>
              <th className="p-3 text-left">Unlocked</th>
              <th className="p-3 text-left">Paid</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, est }) => {
              const estLabel =
                est?.type && typeof est.amount === "number"
                  ? `${est.type === "refund" ? "Refund" : "Owe"} ${money(
                      Math.abs(est.amount)
                    )}`
                  : "-";

              const quarterlyLabel =
                typeof est?.quarterlyPayment === "number" && est.quarterlyPayment > 0
                  ? money(est.quarterlyPayment)
                  : "-";

              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3">
                    <Link
                      className="underline underline-offset-2"
                      href={`/admin/leads/${r.id}`}
                    >
                      {r.email}
                    </Link>
                  </td>

                  <td className="p-3">{estLabel}</td>
                  <td className="p-3">{quarterlyLabel}</td>

                  <td className="p-3">{r.marketingOptIn ? "Yes" : "No"}</td>
                  <td className="p-3">{r.taxPlanUnlocked ? "Yes" : "No"}</td>
                  <td className="p-3">{r.paidAt ? "Yes" : "No"}</td>
                  <td className="p-3">{r.source}</td>
                  <td className="p-3">
                    {new Date(r.updatedAt as any).toLocaleString("en-US")}
                  </td>
                </tr>
              );
            })}

            {!rows.length ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={8}>
                  No leads match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Showing {rows.length} of {rawRows.length} pulled (max 300 displayed).
      </p>
    </div>
  );
}
