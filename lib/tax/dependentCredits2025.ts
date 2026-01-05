import type { FilingStatus } from "./taxYears";

/**
 * Credit for Other Dependents (ODC)
 * IRS Schedule 8812 – Nonrefundable credit
 */
export function calculateDependentsCredit2025({
  count,
  magi,
  filingStatus,
}: {
  count?: number;
  magi: number;
  filingStatus: FilingStatus;
}) {
  if (!count || count <= 0) return 0;

  const MAX_PER_DEPENDENT = 500;
  const baseCredit = count * MAX_PER_DEPENDENT;

  const phaseoutThreshold =
    filingStatus === "mfj" ? 400_000 : 200_000;

  if (magi <= phaseoutThreshold) {
    return baseCredit;
  }

  const reduction =
    Math.ceil((magi - phaseoutThreshold) / 1000) * 50;

  return Math.max(baseCredit - reduction, 0);
}
