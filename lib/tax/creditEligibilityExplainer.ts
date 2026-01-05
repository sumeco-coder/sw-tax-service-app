export function explainCredits({
  hasCTC,
  hasEITC,
}: {
  hasCTC: boolean;
  hasEITC: boolean;
}) {
  return {
    ctc: hasCTC
      ? "Child Tax Credit verified during filing (Schedule 8812)."
      : "May qualify for up to $2,200 per child. SSN required.",
    eitc: hasEITC
      ? "Earned Income Credit verified during filing."
      : "Eligibility depends on income, dependents, and filing status.",
  };
}
