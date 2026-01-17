import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { invoices, invoicePayments, users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";
import { desc, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);

function toNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export default async function PaymentsReportPage() {
  const me = await getServerRole();
  if (!me?.sub) redirect("/admin/sign-in");
  const role = String(me?.role ?? "").toLowerCase();
  if (!(role === "admin" || role === "superadmin")) redirect("/not-authorized");

  const since30 = daysAgo(30);

  const [
    invoiceCounts,
    paidInvoiceCounts,
    unpaidInvoiceCounts,
    invoiceTotalSum,
    paidInvoiceSum,
    paymentStatusCounts,
    latestPayments,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(invoices)
      .then((r) => r[0]?.count ?? 0),

    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(invoices)
      .where(sql`${invoices.paidAt} is not null`)
      .then((r) => r[0]?.count ?? 0),

    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(invoices)
      .where(sql`${invoices.paidAt} is null`)
      .then((r) => r[0]?.count ?? 0),

    db
      .select({ sum: sql<any>`coalesce(sum(${invoices.amount}), 0)` })
      .from(invoices)
      .then((r) => r[0]?.sum ?? 0),

    db
      .select({ sum: sql<any>`coalesce(sum(${invoices.amount}), 0)` })
      .from(invoices)
      .where(sql`${invoices.paidAt} is not null and ${invoices.paidAt} >= ${since30}`)
      .then((r) => r[0]?.sum ?? 0),

    db
      .select({
        status: invoicePayments.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(invoicePayments)
      .groupBy(invoicePayments.status),

    db
      .select({
        id: invoicePayments.id,
        amount: invoicePayments.amount,
        paidOn: invoicePayments.paidOn,
        method: invoicePayments.method,
        status: invoicePayments.status,
        email: users.email,
      })
      .from(invoicePayments)
      .innerJoin(users, eq(users.id, invoicePayments.userId))
      .orderBy(desc(invoicePayments.createdAt))
      .limit(15),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Revenue & Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invoices + payment submissions (last 30 days totals included).
          </p>
        </div>

        <Link
          href="/admin/billing"
          className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
        >
          Open Billing
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Invoices (total)" value={String(invoiceCounts)} />
        <Card label="Invoices paid" value={String(paidInvoiceCounts)} />
        <Card label="Invoices unpaid" value={String(unpaidInvoiceCounts)} />
        <Card label="Invoices total $" value={money(toNumber(invoiceTotalSum))} />
        <Card label="Paid (last 30 days) $" value={money(toNumber(paidInvoiceSum))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-background/80 shadow-sm">
          <div className="border-b p-4">
            <h2 className="font-semibold">Payment submissions by status</h2>
          </div>
          <div className="p-4 space-y-2 text-sm">
            {paymentStatusCounts
              .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
              .map((r) => (
                <div key={String(r.status)} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{String(r.status)}</span>
                  <span className="font-medium">{r.count ?? 0}</span>
                </div>
              ))}
            {!paymentStatusCounts.length ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-background/80 shadow-sm overflow-x-auto">
          <div className="border-b p-4">
            <h2 className="font-semibold">Latest payment submissions</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Method</th>
                <th className="p-3 text-left">Paid on</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {latestPayments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3">{p.email}</td>
                  <td className="p-3">{money(toNumber(p.amount))}</td>
                  <td className="p-3">{p.method}</td>
                  <td className="p-3">{String(p.paidOn ?? "—")}</td>
                  <td className="p-3">{String(p.status)}</td>
                </tr>
              ))}
              {!latestPayments.length ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={5}>
                    No payments yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Invoices use <code>invoices.amount</code>; payment submissions use <code>invoice_payments.amount</code>.
        You can decide whether revenue should be based on invoices paid, submissions approved, or Stripe events later.
      </p>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
