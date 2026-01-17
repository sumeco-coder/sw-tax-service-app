"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { calculateFederalTax2025 } from "@/lib/tax/calculateFederalTax2025";
import type { CalculatorState } from "./types";

const fmtMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function QuickResults({
  state,
  onUpgrade,
  onBack: _onBack, // kept for compatibility with your CalculatorShell; not used by design
}: {
  state: CalculatorState;
  onBack: () => void;
  onUpgrade: () => void;
}) {
  const sp = useSearchParams();

  const utm = useMemo(() => {
    const pick = (k: string) => sp.get(k) ?? undefined;
    return {
      utm_source: pick("utm_source"),
      utm_medium: pick("utm_medium"),
      utm_campaign: pick("utm_campaign"),
      utm_term: pick("utm_term"),
      utm_content: pick("utm_content"),
    };
  }, [sp]);

  const source = useMemo(() => {
    return (sp.get("source") ?? "").trim() || "tax-calculator";
  }, [sp]);

  const result = useMemo(() => {
    return calculateFederalTax2025({
      filingStatus: state.filingStatus,
      w2Income: Number(state.w2Income) || 0,
      selfEmployedIncome: Number(state.selfEmployedIncome) || 0,
      withholding: Number(state.withholding) || 0,
      dependentsCount: Number(state.dependentsCount) || 0,
      otherDependentsCount: Number(state.otherDependentsCount) || 0,
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

  const amount = Math.round(Math.abs(refundOrOwed));
  const type: "refund" | "owe" = isRefund ? "refund" : "owe";

  const bigNumber = isRefund
    ? fmtMoney.format(refundOrOwed)
    : fmtMoney.format(Math.abs(refundOrOwed));

  // ✅ Save estimate + snapshot once per change
  useEffect(() => {
    const emailRaw = String(state.email ?? "").trim();
    const emailLower = emailRaw.toLowerCase();

    if (!emailRaw || !isValidEmail(emailLower)) return;

    // Safe snapshot (same shape as your API allowlist)
    const snapshot = {
      filingStatus: state.filingStatus,
      w2Income: Number(state.w2Income) || 0,
      selfEmployedIncome: Number(state.selfEmployedIncome) || 0,
      withholding: Number(state.withholding) || 0,
      dependentsCount: Number(state.dependentsCount) || 0,
      otherDependentsCount: Number(state.otherDependentsCount) || 0,
      useMultiW2: Boolean(state.w2s && state.w2s.length > 1),
      w2sCount: state.w2s?.length ?? 0,
    };

    const sig = [
      emailLower,
      type,
      amount,
      snapshot.filingStatus,
      snapshot.w2Income,
      snapshot.selfEmployedIncome,
      snapshot.withholding,
      snapshot.dependentsCount,
      snapshot.otherDependentsCount,
      snapshot.w2sCount,
    ].join("|");

    const key = `sw_tax_calc_est_sig_${emailLower}`;

    try {
      if (sessionStorage.getItem(key) === sig) return;
    } catch {
      // ignore
    }

    void fetch("/api/tax-calculator/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailRaw,
        snapshot,
        utm,
        source,
        estimate: { type, amount },
      }),
    }).then(() => {
      try {
        sessionStorage.setItem(key, sig);
      } catch {
        // ignore
      }
    });
  }, [
    state.email,
    state.filingStatus,
    state.w2Income,
    state.selfEmployedIncome,
    state.withholding,
    state.dependentsCount,
    state.otherDependentsCount,
    state.w2s,
    type,
    amount,
    utm,
    source,
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          Estimated {isRefund ? "refund" : "amount owed"}
        </p>

        <h3 className="text-4xl font-semibold tracking-tight">{bigNumber}</h3>

        <p className="text-sm text-muted-foreground">
          Estimate based on simplified assumptions. Final amount verified during filing.
        </p>
      </div>

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
