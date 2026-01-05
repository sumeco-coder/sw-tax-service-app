// lib/tax/quickCtcEstimate2025.ts
import type { FilingStatus } from "./taxYears";

export function estimateQuickCTC2025({
  qualifyingChildren,
  magi,
  filingStatus,
}: {
  qualifyingChildren: number;
  magi: number;
  filingStatus: FilingStatus;
}) {
  if (!qualifyingChildren || qualifyingChildren <= 0) return 0;

  // Quick estimate: assumes child qualifies + SSN verified later.
  const MAX_PER_CHILD = 2200;
  const credit = qualifyingChildren * MAX_PER_CHILD;

  const threshold = filingStatus === "mfj" ? 400_000 : 200_000;
  if (magi <= threshold) return credit;

  const reduction = Math.ceil((magi - threshold) / 1000) * 50;
  return Math.max(credit - reduction, 0);
}
