// lib/tax/safeHarbor.ts
/* ---------------- safe harbor calculation ---------------- */
export function calculateSafeHarbor({
  currentYearTax,
  lastYearTax,
  agi,
}: {
  currentYearTax: number;
  lastYearTax: number;
  agi: number;
}) {
  const priorYearRequired =
    agi > 150000 ? lastYearTax * 1.1 : lastYearTax;

  const ninetyPercentRule = currentYearTax * 0.9;

  return {
    safeHarborAmount: Math.min(
      ninetyPercentRule,
      priorYearRequired
    ),
    method:
      ninetyPercentRule < priorYearRequired
        ? "90% of current year tax"
        : "100% / 110% of prior year tax",
  };
}
