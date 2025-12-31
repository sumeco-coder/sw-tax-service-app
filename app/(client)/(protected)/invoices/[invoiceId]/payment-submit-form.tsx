"use client";

import { useState, useTransition } from "react";
import { submitInvoicePayment } from "./actions";

export default function PaymentSubmitForm({
  invoiceId,
  defaultAmount,
}: {
  invoiceId: string;
  defaultAmount: string; // invoices.amount is numeric (often comes back as string)
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      action={(fd) => {
        setMsg(null);
        startTransition(async () => {
          const res = await submitInvoicePayment(invoiceId, fd);
          if (!res.ok) {
            setMsg(res.message ?? "Please check the form and try again.");
            return;
          }
          setMsg("✅ Payment submitted. We’ll review it shortly.");
        });
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">Method</div>
          <input
            name="method"
            placeholder="Zelle, Cash App, Card, Other"
            className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">Amount</div>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={defaultAmount}
            className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
            required
          />
          <div className="text-xs text-muted-foreground">
            Enter the amount you paid (example: 250.00).
          </div>
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">Paid on</div>
          <input
            name="paidOn"
            type="date"
            className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">Reference (optional)</div>
          <input
            name="reference"
            placeholder="Confirmation #, last4, etc."
            className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="space-y-1 block">
        <div className="text-sm font-medium">Receipt key / proof (optional)</div>
        <input
          name="receiptKey"
          placeholder="S3 key or uploaded receipt id"
          className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <label className="space-y-1 block">
        <div className="text-sm font-medium">Notes (optional)</div>
        <textarea
          name="notes"
          rows={3}
          placeholder="Any details you want us to know"
          className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Submit payment"}
      </button>

      {msg ? <div className="text-sm">{msg}</div> : null}
    </form>
  );
}
