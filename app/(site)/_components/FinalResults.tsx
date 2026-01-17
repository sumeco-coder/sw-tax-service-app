"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { calculateFederalTax2025 } from "@/lib/tax/calculateFederalTax2025";
import { calculateQuarterlyEstimates2025 } from "@/lib/tax/quarterlyEstimates2025";
import { exportTaxSummaryPdf } from "@/lib/pdf/exportTaxSummaryPdf";
import { exportScheduleSEPdf } from "@/lib/pdf/exportScheduleSEPdf";
import { exportQuarterlyIcs } from "@/lib/calendar/exportQuarterlyIcs";
import type { CalculatorState, AccessState } from "./types";
import ScheduleSEBreakdown from "./ScheduleSEBreakdown";
import QuarterlyEstimateCard from "./QuarterlyEstimateCard";
import { TAX_YEAR } from "@/lib/tax/taxYears";

const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type QuarterlyResult = ReturnType<typeof calculateQuarterlyEstimates2025>;

export default function FinalResults({
  state,
  access,
  unlocked,
  onUnlock,
}: {
  state: CalculatorState;
  access: AccessState;
  unlocked: boolean;
  onUnlock: () => void;
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

  // treat access flags as "unlocked" too (manual unlock or paid)
  const isUnlocked = Boolean(unlocked || access?.hasPaidForPlan || access?.filingClient);

  // pass an "effective" access object into exporters so watermark/preview logic can key off it
  const accessForExport: AccessState = useMemo(
    () => ({
      hasPaidForPlan: Boolean(access?.hasPaidForPlan || isUnlocked),
      filingClient: Boolean(access?.filingClient || isUnlocked),
    }),
    [access?.hasPaidForPlan, access?.filingClient, isUnlocked]
  );

  const result = useMemo(() => {
    return calculateFederalTax2025({
      filingStatus: state.filingStatus,
      w2Income: Number(state.w2Income) || 0,
      selfEmployedIncome: Number(state.selfEmployedIncome) || 0,
      withholding: Number(state.withholding) || 0,

      // credits
      dependentsCount: Number(state.dependentsCount ?? 0) || 0,
      otherDependentsCount: Number(state.otherDependentsCount ?? 0) || 0,
    });
  }, [
    state.filingStatus,
    state.w2Income,
    state.selfEmployedIncome,
    state.withholding,
    state.dependentsCount,
    state.otherDependentsCount,
  ]);

  const quarterly: QuarterlyResult = useMemo(() => {
    return calculateQuarterlyEstimates2025(Number(result.totalTax) || 0, Number(state.withholding) || 0);
  }, [result.totalTax, state.withholding]);

  const refundOrOwed = Number(result.refundOrOwed) || 0;
  const isRefund = refundOrOwed >= 0;

  // ✅ Save final estimate + totals (once per change)
  useEffect(() => {
    const rawEmail = String(state.email ?? "").trim();
    const emailLower = rawEmail.toLowerCase();

    if (!rawEmail || !isValidEmail(emailLower)) return;

    // Safe snapshot (same keys your API allow-lists)
    const snapshot = {
      filingStatus: state.filingStatus,
      w2Income: Number(state.w2Income) || 0,
      selfEmployedIncome: Number(state.selfEmployedIncome) || 0,
      withholding: Number(state.withholding) || 0,
      dependentsCount: Number(state.dependentsCount ?? 0) || 0,
      otherDependentsCount: Number(state.otherDependentsCount ?? 0) || 0,
      useMultiW2: Boolean(state.w2s && state.w2s.length > 1),
      w2sCount: state.w2s?.length ?? 0,
    };

    const estimate = {
      type: (isRefund ? "refund" : "owe") as "refund" | "owe",
      amount: Math.round(Math.abs(refundOrOwed)),
      totalTax: Number(result.totalTax) || 0,
      selfEmploymentTax: Number(result.seTax) || 0,
      quarterlyPayment: Number(quarterly.quarterlyPayment) || 0,
    };

    // Build a signature so we only save when values change
    const sig = [
      emailLower,
      estimate.type,
      estimate.amount,
      estimate.totalTax,
      estimate.selfEmploymentTax,
      estimate.quarterlyPayment,
      snapshot.filingStatus,
      snapshot.w2Income,
      snapshot.selfEmployedIncome,
      snapshot.withholding,
      snapshot.dependentsCount,
      snapshot.otherDependentsCount,
      snapshot.w2sCount,
      source,
      utm.utm_source ?? "",
      utm.utm_medium ?? "",
      utm.utm_campaign ?? "",
      utm.utm_term ?? "",
      utm.utm_content ?? "",
    ].join("|");

    const key = `sw_tax_calc_final_sig_${emailLower}`;

    try {
      if (sessionStorage.getItem(key) === sig) return;
    } catch {
      // ignore
    }

    void fetch("/api/tax-calculator/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: rawEmail,
        snapshot,
        utm,
        source,
        estimate,
        // do NOT send marketingOptIn here (prevents overwriting)
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
    refundOrOwed,
    isRefund,
    result.totalTax,
    result.seTax,
    quarterly.quarterlyPayment,
    utm,
    source,
  ]);

  function downloadScheduleSe() {
    exportScheduleSEPdf({
      data: {
        netEarnings: result.netEarnings,
        ssTax: result.ssTax,
        medicareTax: result.medicareTax,
        additionalMedicareTax: result.additionalMedicareTax,
        seTax: result.seTax,
        deductibleHalf: result.deductibleHalf,
      },
      access: accessForExport,
      taxYear: TAX_YEAR,
    });
  }

  function exportCalendarIcs() {
    exportQuarterlyIcs({
      schedule: quarterly.schedule,
      access: accessForExport,
      taxYear: TAX_YEAR,
    });
  }

  function exportTaxPlanPdf() {
    exportTaxSummaryPdf({
      data: {
        filingStatus: state.filingStatus,
        agi: result.agi,
        taxableIncome: result.taxableIncome,
        incomeTax: result.incomeTax,
        seTax: result.seTax,
        totalTax: result.totalTax,
        quarterlyPayment: quarterly.quarterlyPayment,
      },
      access: accessForExport,
      taxYear: TAX_YEAR,
    });
  }

  return (
    <div className="space-y-6">
      {/* Top summary */}
      <div className="rounded-2xl border bg-background/90 shadow-sm backdrop-blur">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Estimated {isRefund ? "refund" : "amount owed"}
              </p>
              <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                {isRefund ? money(refundOrOwed) : money(Math.abs(refundOrOwed))}
              </h3>
              <p className="text-xs text-muted-foreground">
                Based on 2025 federal rules. Final eligibility is verified during filing.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {isUnlocked ? (
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
                  ✅ Unlocked
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                  🔒 Locked preview
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-6">
            <Metric label="AGI" value={money(result.agi)} />
            <Metric label="Taxable income" value={money(result.taxableIncome)} />
            <Metric label="Total tax" value={money(result.totalTax)} />
            <Metric label="Withholding" value={money(Number(state.withholding) || 0)} />
            <Metric label="Kids under 17" value={String(state.dependentsCount ?? 0)} />
            <Metric label="Other dependents 17+" value={String(state.otherDependentsCount ?? 0)} />
          </div>

          {!isUnlocked && (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <p className="font-semibold">Locked preview</p>
              <p className="mt-1 text-muted-foreground">
                You can preview the PDF + calendar export. Unlock full details when you file with us.
              </p>

              <button type="button" className="btn-primary mt-4 w-full" onClick={onUnlock}>
                Included When You File With Us
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Schedule SE breakdown */}
      <div className="rounded-2xl border bg-background/90 shadow-sm backdrop-blur">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Schedule SE (Self-Employment Tax)</h4>

            <button type="button" className="btn-secondary" onClick={downloadScheduleSe}>
              Download Schedule SE PDF
            </button>
          </div>

          <ScheduleSEBreakdown
            netEarnings={result.netEarnings}
            ssTax={result.ssTax}
            medicareTax={result.medicareTax}
            additionalMedicareTax={result.additionalMedicareTax}
            seTax={result.seTax}
            deductibleHalf={result.deductibleHalf}
          />
        </div>
      </div>

      {/* Quarterlies */}
      <div className="rounded-2xl border bg-background/90 shadow-sm backdrop-blur">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-lg font-semibold">Quarterly Estimated Taxes</h4>

            <button type="button" className="btn-secondary" onClick={exportCalendarIcs}>
              {isUnlocked ? "Download Calendar (.ics)" : "Preview Calendar (.ics)"}
            </button>
          </div>

          <QuarterlyEstimateCard
            requiresEstimates={quarterly.requiresEstimates}
            remainingTax={quarterly.remainingTax}
            quarterlyPayment={quarterly.quarterlyPayment}
            schedule={quarterly.schedule}
            access={accessForExport}
          />

          {!isUnlocked && (
            <p className="text-xs text-muted-foreground">
              Preview calendar may show “LOCKED PREVIEW” titles and omit payment amounts until unlocked.
            </p>
          )}
        </div>
      </div>

      {/* PDF exports */}
      <div className="rounded-2xl border bg-background/90 shadow-sm backdrop-blur">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Tax Plan PDF</h4>

            {isUnlocked ? (
              <span className="text-xs text-muted-foreground">Full download available</span>
            ) : (
              <span className="text-xs text-muted-foreground">Preview available</span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" className="btn-secondary w-full" onClick={exportTaxPlanPdf}>
              {isUnlocked ? "Download Full Tax Plan PDF" : "Preview Tax Plan PDF (Watermarked)"}
            </button>

            {!isUnlocked ? (
              <button type="button" className="btn-primary w-full" onClick={onUnlock}>
                Unlock Full Tax Plan
              </button>
            ) : (
              <button type="button" className="btn-outline w-full" onClick={exportTaxPlanPdf}>
                Re-download PDF
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            PDFs are for planning only and are not a filed tax return.
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
