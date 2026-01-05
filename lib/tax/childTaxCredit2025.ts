import { FilingStatus } from "./taxYears";

export type CtcInput = {
  qualifyingChildren: number;
  earnedIncome: number;
  magi: number;
  filingStatus: FilingStatus;
};

export type CtcResult = {
  totalCTC: number;                 // Line 14f
  nonRefundableCTC: number;         // Line 14i
  refundableACTC: number;           // Line 27
  schedule8812: {
    partI: string;
    partII: string;
    partIII: string;
  };
};

const MAX_CTC = 2200;
const MAX_ACTC = 1700;

export function calculateChildTaxCredit2025(
  input: CtcInput,
  taxBeforeCredits: number
): CtcResult {
  const threshold =
    input.filingStatus === "mfj" ? 400_000 : 200_000;

  let totalCTC = input.qualifyingChildren * MAX_CTC;

  if (input.magi > threshold) {
    const reduction =
      Math.ceil((input.magi - threshold) / 1000) * 50;
    totalCTC = Math.max(totalCTC - reduction, 0);
  }

  const nonRefundableCTC = Math.min(
    totalCTC,
    taxBeforeCredits
  );

  const refundableACTC = Math.min(
    MAX_ACTC * input.qualifyingChildren,
    Math.max(totalCTC - nonRefundableCTC, 0)
  );

  return {
    totalCTC,
    nonRefundableCTC,
    refundableACTC,
    schedule8812: {
      partI: "Part I – Filers with qualifying children",
      partII: "Part II – Additional Child Tax Credit",
      partIII: "Part III – Nonrefundable Child Tax Credit",
    },
  };
}
