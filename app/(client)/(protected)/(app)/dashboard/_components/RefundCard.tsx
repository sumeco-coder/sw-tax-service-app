// app/(client)/(protected)/(app)/dashboard/_components/RefundCard.tsx
"use client";

export default function RefundCard({
  refund,
  currency,
  fmtDate,
}: {
  refund: { amount: number | null; eta?: string | Date | null };
  currency: (amount: number | null) => string;
  fmtDate: (d: string | Date) => string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-2">
        Estimated Refund
      </h3>
      <div className="text-2xl font-semibold text-foreground">
        {currency(refund.amount ?? null)}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        ETA: {refund.eta ? fmtDate(refund.eta) : "—"}
      </div>
    </div>
  );
}
