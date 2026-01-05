// lib/tax/quickEitcEstimate2025.ts
export function estimateQuickEITC2025({
  earnedIncome,
  qualifyingChildren,
}: {
  earnedIncome: number;
  qualifyingChildren: number;
}) {
  // Quick estimate: simplified “ballpark”
  if (!qualifyingChildren || qualifyingChildren <= 0) return 0;

  // very rough ceiling (keeps it “quick”)
  if (earnedIncome > 75_000) return 0;

  if (qualifyingChildren === 1) return 4200;
  if (qualifyingChildren === 2) return 7000;
  return 7800; // 3+
}
