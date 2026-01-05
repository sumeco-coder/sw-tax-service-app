// lib/tax/taxYears.ts
/* ---------------- constants ---------------- */
export const TAX_YEAR = 2025;

export const STANDARD_DEDUCTION_2025 = {
  single: 15750,
  hoh: 23625,
  mfj: 31500,
  mfs: 15750,
} as const;

export type FilingStatus = keyof typeof STANDARD_DEDUCTION_2025;
