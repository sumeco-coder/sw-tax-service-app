// lib/tax/quarterlyEstimates2025.ts
/* ---------------- quarterly estimates for 2025 ---------------- */

export type QuarterlyScheduleItem = {
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  due: string;   // e.g. "April 15, 2025"
  amount: number;
};

function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * NOTE:
 * These 2025 installment dates match IRS installment schedule.
 * (Q2 is June 16, 2025 because June 15 falls on a weekend.) :contentReference[oaicite:1]{index=1}
 */
export function calculateQuarterlyEstimates2025(totalTax: number, withholding: number) {
  const safeTotalTax = Math.max(0, Number(totalTax) || 0);
  const safeWithholding = Math.max(0, Number(withholding) || 0);

  const remainingTax = Math.max(safeTotalTax - safeWithholding, 0);
  const requiresEstimates = remainingTax >= 1000;

  if (!requiresEstimates) {
    return {
      requiresEstimates: false,
      remainingTax,
      quarterlyPayment: 0,
      schedule: [] as QuarterlyScheduleItem[],
    };
  }

  // Split into 4 payments (round to cents; adjust last payment so totals match remainingTax)
  const qPay = round2(remainingTax / 4);
  const q4Pay = round2(remainingTax - qPay * 3);

  const schedule: QuarterlyScheduleItem[] = [
    { quarter: "Q1", due: "April 15, 2025", amount: qPay },
    { quarter: "Q2", due: "June 16, 2025", amount: qPay },
    { quarter: "Q3", due: "September 15, 2025", amount: qPay },
    { quarter: "Q4", due: "January 15, 2026", amount: q4Pay },
  ];

  return {
    requiresEstimates: true,
    remainingTax,
    quarterlyPayment: qPay,
    schedule,
  };
}
