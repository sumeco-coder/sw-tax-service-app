"use client";

import { useState } from "react";

const STATUSES = ["DRAFT", "IN_REVIEW", "FILED", "ACCEPTED", "REJECTED", "AMENDED"] as const;

export default function RefundEstimateAdminCard({
  userId,
  taxYear,
  initialAmount,
  initialEta,
  initialStatus,
}: {
  userId: string;
  taxYear: number;
  initialAmount: string | number | null;
  initialEta: string | null;      // "YYYY-MM-DD"
  initialStatus: string;
}) {
  const [amount, setAmount] = useState<string>(initialAmount?.toString() ?? "");
  const [eta, setEta] = useState<string>(initialEta ?? "");
  const [status, setStatus] = useState<string>(initialStatus ?? "DRAFT");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");

    const res = await fetch("/api/admin/tax-returns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        taxYear,
        refundAmount: amount === "" ? null : amount, // keep as string
        refundEta: eta === "" ? null : eta,          // YYYY-MM-DD
        status,
      }),
    });

    setSaving(false);
    setMsg(res.ok ? "Saved ✅" : "Save failed");
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Refund estimate</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Updates the client dashboard for {taxYear}.
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-white
                     bg-[linear-gradient(90deg,#f00067,#4a0055)]
                     disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="text-xs text-muted-foreground">Estimated amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 2500.00"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-1">
          <label className="text-xs text-muted-foreground">ETA (optional)</label>
          <input
            type="date"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {msg ? <div className="mt-3 text-xs text-muted-foreground">{msg}</div> : null}
    </div>
  );
}
