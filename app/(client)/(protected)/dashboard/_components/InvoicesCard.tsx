"use client";

import { cx } from "@/lib/utils/dashboard";
import type { Invoice } from "@/types/dashboard";

export default function InvoicesCard({
  loading,
  invoices,
  currency,
}: {
  loading: boolean;
  invoices: Invoice[];
  currency: (amount: number) => string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">Invoices</h3>

      <ul className="text-sm space-y-2">
        {loading ? (
          <li className="animate-pulse text-muted-foreground">Loading…</li>
        ) : invoices.length === 0 ? (
          <li className="text-muted-foreground">No invoices yet.</li>
        ) : (
          invoices.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-foreground">{currency(inv.amount)}</span>

              <span
                className={cx(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  inv.status === "PAID"
                    ? "bg-emerald-50 text-emerald-700"
                    : inv.status === "UNPAID"
                    ? "bg-amber-50 text-amber-800"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {inv.status}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
