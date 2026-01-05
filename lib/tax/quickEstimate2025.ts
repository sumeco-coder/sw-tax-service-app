// lib/tax/quickEstimate2025.ts
import type { FilingStatus } from "./taxYears";
import { calculateFederalTax2025 } from "./calculateFederalTax2025";
import { estimateQuickCTC2025 } from "./quickCtcEstimate2025";
import { estimateQuickEITC2025 } from "./quickEitcEstimate2025";

export function calculateQuickEstimate2025(input: {
  filingStatus: FilingStatus;
  w2Income: number;
  selfEmployedIncome: number;
  withholding: number;
  dependentsCount?: number;
}) {
  const base = calculateFederalTax2025({
    filingStatus: input.filingStatus,
    w2Income: input.w2Income,
    selfEmployedIncome: input.selfEmployedIncome,
    withholding: input.withholding,
    otherDependentsCount: undefined,
  });

  const earnedIncome = input.w2Income + input.selfEmployedIncome;
  const kids = Math.max(0, input.dependentsCount ?? 0);

  const estCTC = estimateQuickCTC2025({
    qualifyingChildren: kids,
    magi: base.agi, // good enough for quick phaseout estimate
    filingStatus: input.filingStatus,
  });

  const estEITC = estimateQuickEITC2025({
    earnedIncome,
    qualifyingChildren: kids,
  });

  const estimatedRefundOrOwed = base.refundOrOwed + estCTC + estEITC;

  return {
    estimatedRefundOrOwed,
    estimatedCredits: {
      ctc: estCTC,
      eitc: estEITC,
    },
    base, // optional if you want to debug (don’t show it in UI)
  };
}
