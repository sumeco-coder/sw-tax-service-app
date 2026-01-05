"use client";

import { useMemo } from "react";
import { isUnlocked } from "@/lib/access/accessState";
import type { AccessState } from "./types";
import { TAX_YEAR } from "@/lib/tax/taxYears";

export type QuarterlyItem = {
  quarter: string;
  due: string;
  amount: number;
};

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

type Props = {
  requiresEstimates: boolean;
  remainingTax: number;
  quarterlyPayment: number;
  schedule: QuarterlyItem[]; // ✅ from calculateQuarterlyEstimates2025
  safeHarborAmount?: number; // optional (future)
  access: AccessState;
};

export default function QuarterlyEstimateCard({
  requiresEstimates,
  remainingTax,
  quarterlyPayment,
  schedule,
  safeHarborAmount,
  access,
}: Props) {
  const unlocked = isUnlocked(access);

  // If engine didn't provide a schedule (should), fallback ONLY when estimates are required
  const items: QuarterlyItem[] = useMemo(() => {
    if (!requiresEstimates) return [];
    if (Array.isArray(schedule) && schedule.length) return schedule;

    const amt = Number(quarterlyPayment) || 0;
    return [
      { quarter: "Q1", due: `April 15, ${TAX_YEAR}`, amount: amt },
      { quarter: "Q2", due: `June 17, ${TAX_YEAR}`, amount: amt },
      { quarter: "Q3", due: `September 16, ${TAX_YEAR}`, amount: amt },
      { quarter: "Q4", due: `January 15, ${TAX_YEAR + 1}`, amount: amt },
    ];
  }, [requiresEstimates, schedule, quarterlyPayment]);

  const safeHarbor =
    safeHarborAmount === undefined ? undefined : Number(safeHarborAmount) || 0;

  return (
    <div className="space-y-4">
      {/* Status */}
      {!requiresEstimates ? (
        <div className="rounded-2xl border bg-muted/20 p-4">
          <p className="text-sm font-semibold">Estimated payments not required</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Remaining tax after withholding is{" "}
            <span className="font-medium">{money(Math.max(0, remainingTax))}</span>. IRS estimated
            payments usually apply when you’ll owe at least $1,000 after withholding.
          </p>
        </div>
      ) : (
        <>
          {/* Top metrics */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Suggested quarterly payment</p>
              <p className="mt-1 text-lg font-semibold">
                {unlocked ? money(Math.max(0, quarterlyPayment)) : "🔒 Locked"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {unlocked ? "Estimated amount per quarter." : "Unlock to view payment amounts."}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Safe harbor target (optional)</p>
              <p className="mt-1 text-lg font-semibold">
                {safeHarbor === undefined ? "—" : unlocked ? money(Math.max(0, safeHarbor)) : "🔒 Locked"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Helps reduce underpayment risk (final verified during filing).
              </p>
            </div>
          </div>

          {/* Schedule list */}
          <div className="rounded-2xl border p-4">
            <p className="text-sm font-semibold">Quarterly due dates</p>

            <div className="mt-3 divide-y">
              {items.map((it) => (
                <div key={it.quarter} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{it.quarter}</p>
                    <p className="text-xs text-muted-foreground">{it.due}</p>
                  </div>

                  <p className="text-sm font-semibold">
                    {unlocked ? money(Math.max(0, it.amount)) : "—"}
                  </p>
                </div>
              ))}
            </div>

            {!unlocked && (
              <p className="mt-3 text-xs text-muted-foreground">
                Preview shows dates only. Unlock to view amounts + planning notes.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
