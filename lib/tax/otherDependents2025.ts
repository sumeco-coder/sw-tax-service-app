// lib/tax/otherDependents2025.ts
import type { FilingStatus } from "./taxYears";

/**
 * Credit for Other Dependents (ODC)
 * Nonrefundable (Schedule 8812 bucket)
 */
export function calculateOtherDependentCredit2025({
  count,
  magi,
  filingStatus,
}: {
  count?: number;
  magi: number;
  filingStatus: FilingStatus;
}) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n <= 0) return 0;

  const MAX_PER_DEPENDENT = 500;
  const baseCredit = n * MAX_PER_DEPENDENT;

  const threshold = filingStatus === "mfj" ? 400_000 : 200_000;
  if (magi <= threshold) return baseCredit;

  const reduction = Math.ceil((magi - threshold) / 1000) * 50;
  return Math.max(baseCredit - reduction, 0);
}
