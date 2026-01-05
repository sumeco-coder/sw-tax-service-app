// lib/tax/selfEmployment2025.ts
import { FilingStatus } from "./taxYears";

const SS_WAGE_BASE_2025 = 176_100;

export function calculateSelfEmploymentTax2025({
  netProfit,
  w2Wages,
  filingStatus,
}: {
  netProfit: number;
  w2Wages: number;
  filingStatus: FilingStatus;
}) {
  if (netProfit < 400) {
    return {
      netEarnings: 0,
      ssTax: 0,
      medicareTax: 0,
      additionalMedicareTax: 0,
      seTax: 0,
      deductibleHalf: 0,
    };
  }

  // Schedule SE Line 4a
  const netEarnings = netProfit * 0.9235;

  // Shared Social Security wage base
  const ssRemainingBase = Math.max(
    SS_WAGE_BASE_2025 - w2Wages,
    0
  );

  const ssTaxable = Math.min(netEarnings, ssRemainingBase);
  const ssTax = ssTaxable * 0.124;

  // Medicare (no cap)
  const medicareTax = netEarnings * 0.029;

  // Additional Medicare thresholds
  const thresholds: Record<FilingStatus, number> = {
    single: 200000,
    hoh: 200000,
    mfj: 250000,
    mfs: 125000,
  };

  const additionalMedicareTax =
    Math.max(
      w2Wages + netEarnings - thresholds[filingStatus],
      0
    ) * 0.009;

  const seTax =
    ssTax + medicareTax + additionalMedicareTax;

  return {
    netEarnings,
    ssTax,
    medicareTax,
    additionalMedicareTax,
    seTax,
    deductibleHalf: seTax / 2, // Schedule 1
  };
}
