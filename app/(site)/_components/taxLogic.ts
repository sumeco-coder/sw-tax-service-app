// app/(site)/_components/taxLogic.ts
import { FilingStatus } from "@/lib/tax/taxYears";

/**
 * UI-only tax input shape.
 * This is NOT an IRS engine state.
 */
export type UiTaxState = {
  filingStatus: FilingStatus;

  w2Income?: number;
  selfEmployedIncome?: number;
  income?: number; // fallback legacy field
  withholding?: number;

  isDependent?: boolean;
  is65OrOlder?: boolean;
  isBlind?: boolean;

  magi?: number;
};

/**
 * Base standard deduction (UI reference only).
 * Authoritative values live in lib/tax/taxYears.ts
 */
const BASE_STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 16100,
  hoh: 24150,
  mfj: 32200,
  mfs: 16100,
};

/**
 * Calculates standard deduction with UI modifiers.
 * This is for preview / education only.
 */
export function calculateStandardDeduction(
  state: UiTaxState
) {
  let deduction =
    BASE_STANDARD_DEDUCTION[state.filingStatus];

  // Dependent limitation
  if (state.isDependent && state.w2Income !== undefined) {
    deduction = Math.min(
      deduction,
      Math.max(1350, state.w2Income + 450)
    );
  }

  // Age 65+ or Blind (existing law)
  if (state.is65OrOlder || state.isBlind) {
    deduction +=
      state.filingStatus === "mfj" ? 1600 : 2000;
  }

  // Enhanced senior deduction (2025–2028, UI estimate)
  if (state.is65OrOlder && state.magi !== undefined) {
    const magiLimit =
      state.filingStatus === "mfj" ? 150000 : 75000;

    if (state.magi <= magiLimit) {
      deduction += 6000;
    }
  }

  return deduction;
}

/**
 * VERY simplified bracket logic.
 * DO NOT use for filing or final numbers.
 * Authoritative brackets live in lib/tax.
 */
function applyPreviewFederalBrackets(
  taxable: number
) {
  let tax = 0;

  if (taxable <= 11_000) return taxable * 0.1;

  tax += 11_000 * 0.1;
  taxable -= 11_000;

  if (taxable <= 33_725)
    return tax + taxable * 0.12;

  tax += 33_725 * 0.12;
  taxable -= 33_725;

  return tax + taxable * 0.22;
}

/**
 * UI-only federal tax preview.
 * Used ONLY for quick estimates.
 *
 * Real calculations must use:
 * lib/tax/calculateFederalTax2025.ts
 */
export function calculateFederalTaxPreview(
  state: UiTaxState
) {
  const income =
    (state.w2Income ??
      state.income ??
      0) +
    (state.selfEmployedIncome ?? 0);

  const taxableIncome = Math.max(
    income - calculateStandardDeduction(state),
    0
  );

  const incomeTax =
    applyPreviewFederalBrackets(taxableIncome);

  const selfEmploymentTax =
    state.selfEmployedIncome
      ? state.selfEmployedIncome * 0.153
      : 0;

  const totalTax = incomeTax + selfEmploymentTax;

  const refundOrOwed =
    (state.withholding ?? 0) - totalTax;

  return {
    totalTax,
    refundOrOwed,
  };
}
