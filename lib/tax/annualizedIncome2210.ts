// lib/tax/annualizedIncome2210.ts
export function calculateAnnualizedIncome2210({
  cumulativeIncome,
  totalTax,
}: {
  cumulativeIncome: number[]; // [Q1, Q2, Q3, Q4]
  totalTax: number;
}) {
  const requiredPercents = [0.225, 0.45, 0.675, 0.9];

  return cumulativeIncome.map((income, index) => ({
    period: index + 1,
    income,
    requiredTax: totalTax * requiredPercents[index],
  }));
}
