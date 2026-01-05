// lib/tax/ctcActc2025.ts
import type { FilingStatus } from "./taxYears";

const MAX_CTC_PER_CHILD = 2_200; // tax year 2025
const MAX_ACTC_PER_CHILD = 1_700; // refundable cap per child (ACTC) for 2025
const ACTC_EARNED_INCOME_FLOOR = 2_500;
const ACTC_RATE = 0.15;

function phaseoutThreshold(filingStatus: FilingStatus) {
  return filingStatus === "mfj" ? 400_000 : 200_000;
}

function phaseoutReduction(magi: number, threshold: number) {
  if (magi <= threshold) return 0;
  // reduced by $50 for every $1,000 (or part) over the threshold
  return Math.ceil((magi - threshold) / 1000) * 50;
}

export type CtcActc2025Result = {
  qualifyingChildrenUsed: number;

  ctcBeforePhaseout: number;
  phaseoutReduction: number;
  ctcAfterPhaseout: number;

  nonrefundableCtcUsed: number;

  actcIncomeBased: number; // before remaining-ctc cap
  actcRefundable: number;

  remainingCtcAfterNonref: number;

  // for UI
  limits: {
    maxCtcPerChild: number;
    maxActcPerChild: number;
    phaseoutThreshold: number;
    earnedIncomeFloor: number;
    earnedIncomeRate: number;
  };
};

export function calculateCtcActc2025({
  filingStatus,
  qualifyingChildrenUnder17,
  magi,
  earnedIncome,
  incomeTaxAvailableForCtc, // income tax AFTER other nonref credits (like ODC)
}: {
  filingStatus: FilingStatus;
  qualifyingChildrenUnder17: number;
  magi: number;
  earnedIncome: number;
  incomeTaxAvailableForCtc: number;
}): CtcActc2025Result {
  const kids = Math.max(0, Math.floor(Number(qualifyingChildrenUnder17) || 0));
  const threshold = phaseoutThreshold(filingStatus);

  const before = kids * MAX_CTC_PER_CHILD;
  const reduction = phaseoutReduction(Math.max(0, Number(magi) || 0), threshold);
  const after = Math.max(before - reduction, 0);

  // Nonrefundable CTC can only reduce INCOME TAX (not SE tax)
  const nonrefUsed = Math.min(Math.max(0, incomeTaxAvailableForCtc), after);
  const remaining = Math.max(after - nonrefUsed, 0);

  // ACTC income-based amount
  const ei = Math.max(0, Number(earnedIncome) || 0);
  const incomeBased = Math.max(0, ei - ACTC_EARNED_INCOME_FLOOR) * ACTC_RATE;

  const refundableCap = kids * MAX_ACTC_PER_CHILD;

  // Refundable ACTC cannot exceed remaining CTC after nonref use
  const actc = Math.min(incomeBased, refundableCap, remaining);

  return {
    qualifyingChildrenUsed: kids,
    ctcBeforePhaseout: before,
    phaseoutReduction: reduction,
    ctcAfterPhaseout: after,
    nonrefundableCtcUsed: nonrefUsed,
    remainingCtcAfterNonref: remaining,
    actcIncomeBased: incomeBased,
    actcRefundable: actc,
    limits: {
      maxCtcPerChild: MAX_CTC_PER_CHILD,
      maxActcPerChild: MAX_ACTC_PER_CHILD,
      phaseoutThreshold: threshold,
      earnedIncomeFloor: ACTC_EARNED_INCOME_FLOOR,
      earnedIncomeRate: ACTC_RATE,
    },
  };
}
