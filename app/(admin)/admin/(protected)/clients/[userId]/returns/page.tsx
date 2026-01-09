"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

const STATUSES = [
  "PENDING",
  "DRAFT",
  "IN_REVIEW",
  "FILED",
  "ACCEPTED",
  "REJECTED",
  "AMENDED",
] as const;

type Status = (typeof STATUSES)[number];

function to2(n: number) {
  return n.toFixed(2);
}

export default function AdminReturnEditorPage() {
  const params = useParams<{ userId: string }>();
  const sp = useSearchParams();

  const userId = params.userId;
  const year = useMemo(
    () => Number(sp.get("year") || new Date().getFullYear()),
    [sp]
  );

  const [status, setStatus] = useState<Status>("PENDING");
  const [mode, setMode] = useState<"refund" | "owed">("refund");

  // user types absolute amount; we sign it at save time based on mode
  const [amountText, setAmountText] = useState<string>("");
  const [refundEta, setRefundEta] = useState<string>(""); // YYYY-MM-DD

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // Load existing values (requires GET route /api/admin/tax-returns/[userId])
  useEffect(() => {
    let alive = true;
    setMsg("");

    fetch(`/api/admin/tax-returns/${userId}?year=${year}`, {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return;

        const tr = data?.taxReturn;
        if (!tr) return;

        const st = String(tr.status || "PENDING").toUpperCase();
        setStatus((STATUSES.includes(st as any) ? st : "PENDING") as Status);

        const raw = tr.refundAmount;
        const n =
          raw === null || raw === undefined || raw === ""
            ? null
            : Number(String(raw));

        if (n === null || !Number.isFinite(n)) {
          setMode("refund");
          setAmountText("");
        } else if (n < 0) {
          setMode("owed");
          setAmountText(String(Math.abs(n)));
        } else {
          setMode("refund");
          setAmountText(String(n));
        }

        setRefundEta((tr.refundEta ?? "").slice(0, 10));
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [userId, year]);

  function buildSignedAmount(): string | null {
    const trimmed = amountText.trim();
    if (!trimmed) return null;

    // allow "1,234.56"
    const normalized = trimmed.replace(/,/g, "");
    const n = Number(normalized);

    if (!Number.isFinite(n)) return null;

    const abs = Math.abs(n);
    const signed = mode === "owed" ? -abs : abs;

    return to2(signed); // string for Postgres numeric
  }

  async function save() {
    setMsg("");

    const signed = buildSignedAmount();
    if (amountText.trim() && signed === null) {
      setMsg("Enter a valid amount (example: 9419.67).");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/admin/tax-returns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        userId,
        taxYear: year,
        status,
        refundAmount: signed, // positive refund, negative owed
        refundEta: refundEta.trim() ? refundEta : null,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      setMsg("Save failed. Check permissions / input.");
      return;
    }

    setMsg("Saved ✅");
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Return Editor</h1>
          <p className="text-sm text-muted-foreground">
            User: <span className="font-mono">{userId}</span> • Year: {year}
          </p>
        </div>

        <Link
          href="/admin/returns"
          className="rounded-lg border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          Back
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Status</label>
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Amount type toggle */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount</label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("refund")}
              className={[
                "rounded-lg border px-3 py-2 text-sm font-semibold",
                mode === "refund"
                  ? "bg-foreground text-background"
                  : "bg-background hover:bg-muted",
              ].join(" ")}
            >
              Refund to client
            </button>

            <button
              type="button"
              onClick={() => setMode("owed")}
              className={[
                "rounded-lg border px-3 py-2 text-sm font-semibold",
                mode === "owed"
                  ? "bg-foreground text-background"
                  : "bg-background hover:bg-muted",
              ].join(" ")}
            >
              Client owes
            </button>
          </div>

          <input
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            inputMode="decimal"
            placeholder={mode === "refund" ? "e.g. 9419.67" : "e.g. 1200.00"}
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
          />

          <p className="text-xs text-muted-foreground">
            Stored in <code>tax_returns.refundAmount</code> as signed:
            refund = positive, owed = negative.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">ETA (optional)</label>
          <input
            type="date"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={refundEta}
            onChange={(e) => setRefundEta(e.target.value)}
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {msg ? <p className="text-sm">{msg}</p> : null}
      </div>
    </div>
  );
}
