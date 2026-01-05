// lib/tax/eitc2025.ts
import type { FilingStatus } from "./taxYears";

/**
 * EITC (Earned Income Tax Credit) – Tax Year 2025 (filed in 2026)
 *
 * Uses IRS inflation-adjusted parameters from Rev. Proc. 2024-40 (TY2025).
 * IMPORTANT: This is "math-correct" for the credit schedule, but it does NOT
 * fully validate every eligibility rule (age, residency, dependency, prior EIC
 * disallowance, etc.). Final eligibility is confirmed during filing.
 */

export type EitcInput = {
  filingStatus: FilingStatus;

  /** W-2 wages + net SE earnings treated as earned income (simplified). */
  earnedIncome: number;

  /** If you have AGI, pass it. Phaseout uses the GREATER of earned income or AGI. */
  agi?: number;

  /** Dividends, interest, cap gains, etc. EITC disallowed above annual limit. */
  investmentIncome?: number;

  /** Prefer this name (original). */
  qualifyingChildren?: number;

  /** Back-compat for your calculator call-site. */
  qualifyingChildrenCount?: number;

  /** SSN rules (estimator UI typically assumes "true") */
  taxpayerHasValidSSN?: boolean;
  childrenHaveValidSSN?: boolean;

  /**
   * Special rule: some MFS filers can claim EITC if separated-spouse requirements are met.
   * If true, we allow MFS and use the "all other statuses" thresholds.
   */
  isSeparatedSpouseForEitc?: boolean;

  /** Back-compat alias used in your calculateFederalTax2025 call-site. */
  allowMfs?: boolean;
};

export type EitcResult = {
  eligible: boolean;

  /** Primary amount your app uses */
  eitc: number;

  /** Alias (handy for tooling / debugging) */
  creditAmount: number;

  reason?: string;

  irsReference: string;

  details?: {
    qualifyingChildrenUsed: number;
    earnedIncomeUsed: number;
    agiUsed: number;
    phaseoutBaseUsed: number;

    maxCredit: number;
    earnedIncomeAmount: number;

    thresholdPhaseout: number;
    completedPhaseout: number;

    phaseInRate: number;
    phaseOutRate: number;

    investmentIncomeLimit: number;
  };
};

// TY2025 investment income limit (Rev. Proc. 2024-40)
const INVESTMENT_INCOME_LIMIT_2025 = 11_950;

type EitcParams = {
  earnedIncomeAmount: number;
  maxCredit: number;

  thresholdPhaseout_mfj: number;
  completedPhaseout_mfj: number;

  thresholdPhaseout_other: number;
  completedPhaseout_other: number;
};

/**
 * Parameters for TY2025 (Rev. Proc. 2024-40 table)
 * Key: # of qualifying children (capped at 3+)
 */
const EITC_PARAMS_2025: Record<0 | 1 | 2 | 3, EitcParams> = {
  0: {
    earnedIncomeAmount: 8_490,
    maxCredit: 649,
    thresholdPhaseout_mfj: 17_730,
    completedPhaseout_mfj: 26_214,
    thresholdPhaseout_other: 10_620,
    completedPhaseout_other: 19_104,
  },
  1: {
    earnedIncomeAmount: 12_730,
    maxCredit: 4_328,
    thresholdPhaseout_mfj: 30_470,
    completedPhaseout_mfj: 57_554,
    thresholdPhaseout_other: 23_350,
    completedPhaseout_other: 50_434,
  },
  2: {
    earnedIncomeAmount: 17_880,
    maxCredit: 7_152,
    thresholdPhaseout_mfj: 30_470,
    completedPhaseout_mfj: 64_430,
    thresholdPhaseout_other: 23_350,
    completedPhaseout_other: 57_310,
  },
  3: {
    earnedIncomeAmount: 17_880,
    maxCredit: 8_046,
    thresholdPhaseout_mfj: 30_470,
    completedPhaseout_mfj: 68_675,
    thresholdPhaseout_other: 23_350,
    completedPhaseout_other: 61_555,
  },
};

function clampChildren(n: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function roundDollars(n: number) {
  return Math.max(0, Math.round(n));
}

export function calculateEitc2025(input: EitcInput): EitcResult {
  const {
    filingStatus,
    earnedIncome,
    agi,
    investmentIncome = 0,

    // accept both names
    qualifyingChildrenCount,
    qualifyingChildren,

    // default “true” for estimator (since your UI doesn’t ask)
    taxpayerHasValidSSN = true,
    childrenHaveValidSSN = true,

    // accept both flags
    isSeparatedSpouseForEitc = false,
    allowMfs = false,
  } = input;

  const earned = Math.max(0, Number(earnedIncome) || 0);
  const agiUsed = Math.max(0, Number(agi ?? earned) || 0);

  const qcRaw =
    qualifyingChildrenCount ?? qualifyingChildren ?? 0;
  const childCount = clampChildren(Number(qcRaw) || 0);

  const mfsAllowed = Boolean(isSeparatedSpouseForEitc || allowMfs);

  // Filing status rule: MFS generally not allowed unless exception applies.
  if (filingStatus === "mfs" && !mfsAllowed) {
    return {
      eligible: false,
      eitc: 0,
      creditAmount: 0,
      reason:
        "EITC is generally not allowed for Married Filing Separately (unless separated-spouse rules apply).",
      irsReference: "Rev. Proc. 2024-40; Form 1040 Instructions – EIC",
    };
  }

  // SSN requirements (simplified flags)
  if (!taxpayerHasValidSSN) {
    return {
      eligible: false,
      eitc: 0,
      creditAmount: 0,
      reason: "Taxpayer must have a valid SSN for EITC.",
      irsReference: "Form 1040 Instructions – EIC",
    };
  }
  if (childCount > 0 && !childrenHaveValidSSN) {
    return {
      eligible: false,
      eitc: 0,
      creditAmount: 0,
      reason: "Qualifying children must have valid SSNs for EITC.",
      irsReference: "Schedule EIC (Form 1040) Instructions",
    };
  }

  // Investment income limit
  if (Number(investmentIncome) > INVESTMENT_INCOME_LIMIT_2025) {
    return {
      eligible: false,
      eitc: 0,
      creditAmount: 0,
      reason: "Investment income exceeds the IRS limit for EITC.",
      irsReference: "IRC §32(i); Rev. Proc. 2024-40",
    };
  }

  // No earned income -> no EITC
  if (earned <= 0) {
    return {
      eligible: false,
      eitc: 0,
      creditAmount: 0,
      reason: "No earned income reported.",
      irsReference: "Schedule EIC (Form 1040)",
    };
  }

  const p = EITC_PARAMS_2025[childCount];

  // Threshold set applies only to MFJ; everyone else (including allowed MFS) uses "other"
  const treatAsMfj = filingStatus === "mfj";

  const thresholdPhaseout = treatAsMfj
    ? p.thresholdPhaseout_mfj
    : p.thresholdPhaseout_other;

  const completedPhaseout = treatAsMfj
    ? p.completedPhaseout_mfj
    : p.completedPhaseout_other;

  // Derive rates
  const phaseInRate =
    p.earnedIncomeAmount > 0 ? p.maxCredit / p.earnedIncomeAmount : 0;

  const phaseOutDenom = Math.max(1, completedPhaseout - thresholdPhaseout);
  const phaseOutRate = p.maxCredit / phaseOutDenom;

  // Phase-in
  let credit = Math.min(p.maxCredit, earned * phaseInRate);

  // Phase-out base is GREATER of earned income or AGI
  const phaseoutBase = Math.max(earned, agiUsed);

  if (phaseoutBase > thresholdPhaseout) {
    credit = Math.max(0, credit - (phaseoutBase - thresholdPhaseout) * phaseOutRate);
  }

  const creditRounded = roundDollars(credit);

  return {
    eligible: creditRounded > 0,
    eitc: creditRounded,
    creditAmount: creditRounded,
    irsReference: "Rev. Proc. 2024-40; Schedule EIC (Form 1040)",
    details: {
      qualifyingChildrenUsed: childCount,
      earnedIncomeUsed: earned,
      agiUsed,
      phaseoutBaseUsed: phaseoutBase,

      maxCredit: p.maxCredit,
      earnedIncomeAmount: p.earnedIncomeAmount,

      thresholdPhaseout,
      completedPhaseout,

      phaseInRate,
      phaseOutRate,

      investmentIncomeLimit: INVESTMENT_INCOME_LIMIT_2025,
    },
  };
}
