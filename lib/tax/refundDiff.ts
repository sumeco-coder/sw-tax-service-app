export function explainRefundDiff({
  quickRefund,
  finalRefund,
}: {
  quickRefund: number;
  finalRefund: number;
}) {
  const diff = finalRefund - quickRefund;

  if (diff === 0) return "Your estimate did not change.";

  if (diff < 0) {
    return "Your refund decreased because estimated credits (CTC/EITC) require verification during filing.";
  }

  return "Your refund increased due to verified credits or adjustments.";
}
