// app/(client)/(protected)/(app)/dashboard/_components/RefundDeliveryCard.tsx
"use client";

import Link from "next/link";

type RefundDelivery = {
  method: "direct_deposit" | "check" | "not_set";
  bankLast4?: string | null;
};

function methodLabel(method: RefundDelivery["method"]) {
  if (method === "direct_deposit") return "Direct deposit";
  if (method === "check") return "Check";
  return "Not set";
}

export default function RefundDeliveryCard({
  delivery,
  updateHref = "/questionnaire",
}: {
  delivery: RefundDelivery;
  updateHref?: string;
}) {
  const label = methodLabel(delivery.method);

  const suffix =
    delivery.method === "direct_deposit" && delivery.bankLast4
      ? ` (****${delivery.bankLast4})`
      : "";

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Refund delivery
          </h3>

          <div className="text-2xl font-semibold text-foreground">
            {label}
            {suffix ? (
              <span className="text-muted-foreground font-medium">{suffix}</span>
            ) : null}
          </div>

          <div className="text-xs text-muted-foreground mt-1">
            Manage this in Questionnaire
          </div>
        </div>

        <Link
          href={updateHref}
          className="text-xs font-medium text-foreground underline underline-offset-4"
        >
          Update
        </Link>
      </div>
    </div>
  );
}
