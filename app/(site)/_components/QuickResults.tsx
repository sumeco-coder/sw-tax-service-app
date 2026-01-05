"use client";

import { useMemo } from "react";
import { calculateFederalTax2025 } from "@/lib/tax/calculateFederalTax2025";
import type { CalculatorState } from "./types";

const fmtMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function QuickResults({
  state,
  onUpgrade,
  onBack: _onBack, // kept for compatibility with your CalculatorShell; not used by design
}: {
  state: CalculatorState;
  onBack: () => void;
  onUpgrade: () => void;
}) {
  const result = useMemo(() => {
    return calculateFederalTax2025({
      filingStatus: state.filingStatus,
      w2Income: Number(state.w2Income) || 0,
      selfEmployedIncome: Number(state.selfEmployedIncome) || 0,
      withholding: Number(state.withholding) || 0,

      // ✅ dependents now handled by engine
      dependentsCount: Number(state.dependentsCount) || 0,
      otherDependentsCount: Number(state.otherDependentsCount) || 0,

      // optional in your engine; keep 0 for quick mode
      investmentIncome: 0,
    });
  }, [
    state.filingStatus,
    state.w2Income,
    state.selfEmployedIncome,
    state.withholding,
    state.dependentsCount,
    state.otherDependentsCount,
  ]);

  const refundOrOwed = Number(result.refundOrOwed) || 0;
  const isRefund = refundOrOwed >= 0;

  const bigNumber = isRefund
    ? fmtMoney.format(refundOrOwed)
    : fmtMoney.format(Math.abs(refundOrOwed));

  return (
    <div className="space-y-6">
      {/* Big number */}
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          Estimated {isRefund ? "refund" : "amount owed"}
        </p>

        <h3 className="text-4xl font-semibold tracking-tight">{bigNumber}</h3>

        <p className="text-sm text-muted-foreground">
          Estimate based on simplified assumptions. Final amount verified during filing.
        </p>
      </div>

      {/* CTA */}
      <button
        type="button"
        className="w-full rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-sm
                   hover:opacity-95 hover:shadow-md transition
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        onClick={onUpgrade}
      >
        View full breakdown
      </button>
    </div>
  );
}
