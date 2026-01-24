// app/(admin)/admin/(protected)/billing/_components/BillingClient.tsx
"use client";

import { useMemo, useState } from "react";

type Payment = {
  id: string;
  method: string;
  amount: string;        // decimal string (ex: "350.00")
  paidOn: string | null; // "YYYY-MM-DD"
  status: "submitted" | "approved" | "rejected";
  reference: string | null;
  createdAt: string | null;
};

type Invoice = {
  id: string;
  userId: string;
  taxReturnId: string | null;
  amount: string; // decimal string
  status: "UNPAID" | "PAID" | "VOID" | "PAYMENT_SUBMITTED" | "REFUNDED" | "PARTIAL";
  issuedAt: string | null; // ISO
  paidAt: string | null;   // ISO
  payments: Payment[];
};

function fmtMoneyDecimal(amount: string, currency = "USD") {
  const n = Number.parseFloat(amount || "0");
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    Number.isFinite(n) ? n : 0
  );
}

function fmtDate(isoOrNull: string | null) {
  if (!isoOrNull) return "—";
  const d = new Date(isoOrNull);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function pillClass(status: Invoice["status"]) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  if (status === "PAID") return `${base} bg-emerald-500/10 text-emerald-600`;
  if (status === "UNPAID") return `${base} bg-amber-500/10 text-amber-700`;
  if (status === "PAYMENT_SUBMITTED") return `${base} bg-sky-500/10 text-sky-700`;
  if (status === "PARTIAL") return `${base} bg-violet-500/10 text-violet-700`;
  if (status === "REFUNDED") return `${base} bg-slate-500/10 text-slate-600`;
  if (status === "VOID") return `${base} bg-rose-500/10 text-rose-600`;
  return `${base} bg-slate-500/10 text-slate-600`;
}

export default function BillingClient({ invoices }: { invoices: Invoice[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | Invoice["status"]>("ALL");

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();

    return (invoices || []).filter((inv) => {
      if (status !== "ALL" && inv.status !== status) return false;
      if (!query) return true;

      const haystack = [
        inv.id,
        inv.userId,
        inv.taxReturnId ?? "",
        inv.status,
        inv.amount,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [invoices, q, status]);

  const statuses = useMemo(() => {
    const s = new Set<Invoice["status"]>();
    (invoices || []).forEach((i) => s.add(i.status));
    return Array.from(s);
  }, [invoices]);

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Invoices</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} shown
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search (invoice/user/status)…"
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-64"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-56"
          >
            <option value="ALL">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b">
              <th className="py-3 pr-4">Invoice</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Amount</th>
              <th className="py-3 pr-4">Issued</th>
              <th className="py-3 pr-4">Paid</th>
              <th className="py-3 pr-0 text-right">Payments</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No invoices found.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{inv.id.slice(0, 10)}</div>
                    <div className="text-xs text-muted-foreground">User: {inv.userId.slice(0, 10)}</div>
                  </td>

                  <td className="py-3 pr-4">
                    <span className={pillClass(inv.status)}>{inv.status}</span>
                  </td>

                  <td className="py-3 pr-4">{fmtMoneyDecimal(inv.amount)}</td>
                  <td className="py-3 pr-4">{fmtDate(inv.issuedAt)}</td>
                  <td className="py-3 pr-4">{fmtDate(inv.paidAt)}</td>

                  <td className="py-3 pr-0 text-right">
                    <span className="text-muted-foreground">
                      {inv.payments?.length ?? 0}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
