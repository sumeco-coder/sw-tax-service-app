// lib/tax/calculateFederalTax2025.ts
import { TAX_BRACKETS_2025 } from "./taxBrackets2025";
import { STANDARD_DEDUCTION_2025, type FilingStatus } from "./taxYears";
import { calculateSelfEmploymentTax2025 } from "./selfEmployment2025";
import { calculateOtherDependentCredit2025 } from "./otherDependents2025";
import { calculateCtcActc2025 } from "./ctcActc2025";
import { calculateEitc2025 } from "./eitc2025";

export function calculateFederalTax2025({
  filingStatus,
  w2Income,
  selfEmployedIncome,
  withholding,

  // dependents
  dependentsCount = 0, // kids under 17 (CTC/ACTC + used as EITC qualifying kids in quick mode)
  otherDependentsCount = 0, // 17+ / qualifying relatives (ODC)

  // EITC-related (optional / “verified during filing”)
  investmentIncome = 0,
  taxpayerHasValidSSN = true,
  childrenHaveValidSSN = true,
  isSeparatedSpouseForEitc = false,
}: {
  filingStatus: FilingStatus;
  w2Income: number;
  selfEmployedIncome: number;
  withholding: number;

  dependentsCount?: number;
  otherDependentsCount?: number;

  investmentIncome?: number;
  taxpayerHasValidSSN?: boolean;
  childrenHaveValidSSN?: boolean;
  isSeparatedSpouseForEitc?: boolean;
}) {
  const w2 = Math.max(0, Number(w2Income) || 0);
  const seProfit = Math.max(0, Number(selfEmployedIncome) || 0);
  const wh = Math.max(0, Number(withholding) || 0);

  const kidsU17 = Math.max(0, Math.floor(Number(dependentsCount) || 0));
  const otherDeps = Math.max(0, Math.floor(Number(otherDependentsCount) || 0));

  const se = calculateSelfEmploymentTax2025({
    netProfit: seProfit,
    w2Wages: w2,
    filingStatus,
  });

  const totalIncome = w2 + seProfit;

  // AGI includes the SE half deduction
  const agi = Math.max(0, totalIncome - se.deductibleHalf);

  // Taxable income
  const taxableIncome = Math.max(
    agi - STANDARD_DEDUCTION_2025[filingStatus],
    0
  );

  // Regular income tax
  let incomeTax = 0;
  for (const [min, max, rate] of TAX_BRACKETS_2025[filingStatus]) {
    if (taxableIncome > min) {
      incomeTax += (Math.min(taxableIncome, max) - min) * rate;
    }
  }

  /**
   * -------------------------
   * NONREFUNDABLE CREDITS
   * -------------------------
   * Important: nonref credits reduce INCOME TAX only (not SE tax)
   */

  // ODC (Other Dependents Credit) – nonrefundable (Schedule 8812 bucket)
  const odc = calculateOtherDependentCredit2025({
    count: otherDeps,
    magi: agi,
    filingStatus,
  });

  const odcUsed = Math.min(incomeTax, odc);
  const incomeTaxAfterOdc = Math.max(incomeTax - odcUsed, 0);

  // Earned income (simplified): W-2 wages + SE net earnings (Schedule SE concept)
  const earnedIncome = Math.max(0, w2 + Math.max(0, Number(se.netEarnings) || 0));

  // CTC + ACTC (Schedule 8812 engine)
  const ctc = calculateCtcActc2025({
    filingStatus,
    qualifyingChildrenUnder17: kidsU17,
    magi: agi,
    earnedIncome,
    incomeTaxAvailableForCtc: incomeTaxAfterOdc,
  });

  const incomeTaxAfterCredits = Math.max(
    incomeTaxAfterOdc - ctc.nonrefundableCtcUsed,
    0
  );

  /**
   * Total tax liability:
   * - income tax after nonref credits
   * - plus SE tax (credits do NOT reduce SE tax)
   */
  const totalTax = incomeTaxAfterCredits + se.seTax;

  /**
   * -------------------------
   * REFUNDABLE CREDITS
   * -------------------------
   */

  const eitc = calculateEitc2025({
    filingStatus,
    earnedIncome,
    agi, // EITC phases out on the greater of earned income or AGI
    investmentIncome,
    qualifyingChildren: kidsU17,
    
    taxpayerHasValidSSN,
    childrenHaveValidSSN,
    isSeparatedSpouseForEitc,
  });

  const eitcAmount = Math.max(0, Number(eitc.creditAmount) || 0);
  const actcAmount = Math.max(0, Number(ctc.actcRefundable) || 0);

  const refundableCredits = actcAmount + eitcAmount;

  // Payments (withholding + refundable credits)
  const payments = wh + refundableCredits;

  // Positive = refund, negative = owed
  const refundOrOwed = payments - totalTax;

  return {
    // Base
    agi,
    taxableIncome,
    incomeTax,

    // SE details
    ...se,

    // Credits breakdown
    otherDependentCredit: odc,
    otherDependentCreditUsed: odcUsed,

    ctc: ctc.ctcAfterPhaseout,
    ctcNonrefUsed: ctc.nonrefundableCtcUsed,
    actc: actcAmount,

    eitcEligible: eitc.eligible,
    eitc: eitcAmount,
    eitcReason: eitc.reason,
    eitcReference: eitc.irsReference,
    eitcDetails: eitc.details,

    // Totals
    totalTax,
    refundableCredits,
    payments,
    refundOrOwed,

    // Helpful fields
    earnedIncome,
    dependentsCount: kidsU17,
    otherDependentsCount: otherDeps,

    effectiveRate: totalIncome > 0 ? totalTax / totalIncome : 0,
  };
}
