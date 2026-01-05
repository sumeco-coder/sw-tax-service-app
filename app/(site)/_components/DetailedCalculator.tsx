"use client";

import { useMemo, useState } from "react";
import type { CalculatorState, W2Entry } from "./types";

function makeId(prefix = "w2") {
  // crypto.randomUUID in modern browsers; fallback for safety
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) return `${prefix}_${g.crypto.randomUUID()}`;
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function toMoneyNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function toCountInt(v: unknown) {
  return Math.max(0, Math.floor(Number(v) || 0));
}

export default function DetailedCalculator({
  state,
  onChange,
  onCalculate,
}: {
  state: CalculatorState;
  onChange: (s: CalculatorState) => void;
  onCalculate: () => void;
}) {
  // Allow filing status changes in detailed step too
  const [filingStatus, setFilingStatus] = useState(state.filingStatus);

  // Seed W-2 rows
  const [w2s, setW2s] = useState<W2Entry[]>(
    state.w2s && state.w2s.length > 0
      ? state.w2s
      : [
          {
            id: makeId(),
            employerName: "",
            wages: state.w2Income ?? 0,
            federalWithholding: state.withholding ?? 0,
          },
        ]
  );

  const [additionalWithholding, setAdditionalWithholding] = useState<number>(
    state.additionalWithholding ?? 0
  );

  const [selfEmployedIncome, setSelfEmployedIncome] = useState<number>(
    state.selfEmployedIncome ?? 0
  );

  const [dependentsCount, setDependentsCount] = useState<number>(
    state.dependentsCount ?? 0
  );

  const [otherDependentsCount, setOtherDependentsCount] = useState<number>(
    state.otherDependentsCount ?? 0
  );

  const [pending, setPending] = useState(false);

  const totals = useMemo(() => {
    const wages = w2s.reduce((sum, r) => sum + toMoneyNumber(r.wages), 0);
    const w2Wh = w2s.reduce(
      (sum, r) => sum + toMoneyNumber(r.federalWithholding),
      0
    );
    const extra = toMoneyNumber(additionalWithholding);

    return {
      wages: Math.max(0, wages),
      w2Withholding: Math.max(0, w2Wh),
      withholding: Math.max(0, w2Wh + extra),
      extraWithholding: extra,
    };
  }, [w2s, additionalWithholding]);

  function addW2() {
    setW2s((prev) => [
      ...prev,
      {
        id: makeId(),
        employerName: "",
        wages: 0,
        federalWithholding: 0,
      },
    ]);
  }

  function removeW2(id: string) {
    setW2s((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.id !== id)));
  }

  function updateW2(id: string, patch: Partial<W2Entry>) {
    setW2s((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function syncAndCalculate() {
    try {
      setPending(true);

      const normalizedW2s = w2s.map((r) => ({
        ...r,
        employerName: (r.employerName ?? "").trim(),
        wages: toMoneyNumber(r.wages),
        federalWithholding: toMoneyNumber(r.federalWithholding),
      }));

      const next: CalculatorState = {
        ...state,
        filingStatus,
        w2s: normalizedW2s,

        // totals from W-2 list
        w2Income: totals.wages,
        withholding: totals.withholding,

        // supporting fields
        additionalWithholding: totals.extraWithholding,
        selfEmployedIncome: toMoneyNumber(selfEmployedIncome),
        dependentsCount: toCountInt(dependentsCount),
        otherDependentsCount: toCountInt(otherDependentsCount),
      };

      // Update parent state first…
      onChange(next);

      // …then move to final step (avoids “stale totals” render edge cases)
      await Promise.resolve();
      onCalculate();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Full Inputs</h2>
        <p className="text-sm text-muted-foreground">
          Add multiple W-2s, 1099/self-employment, and dependents for a clearer estimate.
        </p>
      </div>

      {/* Filing Status */}
      <div className="rounded-2xl border p-5 space-y-3">
        <h3 className="text-base font-semibold">Filing Status</h3>
        <select
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={filingStatus}
          onChange={(e) => setFilingStatus(e.target.value as any)}
        >
          <option value="single">Single</option>
          <option value="hoh">Head of Household</option>
          <option value="mfj">Married Filing Jointly</option>
          <option value="mfs">Married Filing Separately</option>
        </select>
      </div>

      {/* W-2 Section */}
      <div className="rounded-2xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">W-2 Income</h3>
          <button type="button" className="btn-secondary" onClick={addW2}>
            + Add W-2
          </button>
        </div>

        <div className="space-y-3">
          {w2s.map((row, idx) => (
            <div key={row.id} className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">W-2 #{idx + 1}</p>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => removeW2(row.id)}
                  disabled={w2s.length <= 1}
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="text-xs text-muted-foreground">Employer (optional)</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={row.employerName ?? ""}
                    placeholder="Company name"
                    onChange={(e) => updateW2(row.id, { employerName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Wages (Box 1)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={row.wages || ""}
                    placeholder="$0"
                    onChange={(e) => updateW2(row.id, { wages: toMoneyNumber(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Fed withholding (Box 2)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={row.federalWithholding || ""}
                    placeholder="$0"
                    onChange={(e) =>
                      updateW2(row.id, { federalWithholding: toMoneyNumber(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="rounded-xl bg-muted/30 p-4 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total W-2 wages</span>
            <span className="font-semibold">${totals.wages.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">W-2 withholding total</span>
            <span className="font-semibold">${totals.w2Withholding.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Withholding (incl. extra)</span>
            <span className="font-semibold">${totals.withholding.toLocaleString()}</span>
          </div>
        </div>

        <Field
          label="Other federal withholding (optional)"
          helper="If you have withholding not shown on W-2s"
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="$0"
            value={additionalWithholding === 0 ? "" : additionalWithholding}
            onChange={(e) => setAdditionalWithholding(toMoneyNumber(e.target.value))}
          />
        </Field>
      </div>

      {/* 1099 / Self-employed */}
      <div className="rounded-2xl border p-5 space-y-3">
        <h3 className="text-base font-semibold">1099 / Self-employment</h3>
        <Field
          label="Net self-employment income"
          helper="Estimate your business net profit (after expenses)."
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="$0"
            value={selfEmployedIncome === 0 ? "" : selfEmployedIncome}
            onChange={(e) => setSelfEmployedIncome(toMoneyNumber(e.target.value))}
          />
        </Field>
      </div>

      {/* Dependents */}
      <div className="rounded-2xl border p-5 space-y-3">
        <h3 className="text-base font-semibold">Dependents</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Children under 17" helper="CTC/ACTC + EITC estimate (verified during filing)">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="0"
              value={dependentsCount === 0 ? "" : dependentsCount}
              onChange={(e) => setDependentsCount(toCountInt(e.target.value))}
            />
          </Field>

          <Field
            label="Other dependents (17+ / qualifying relatives)"
            helper="ODC planning ($500 each). Verified during filing."
          >
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="0"
              value={otherDependentsCount === 0 ? "" : otherDependentsCount}
              onChange={(e) => setOtherDependentsCount(toCountInt(e.target.value))}
            />
          </Field>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        disabled={pending}
        onClick={() => void syncAndCalculate()}
        className="w-full rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-sm transition
                 hover:shadow-md hover:opacity-95
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2
                 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Calculating..." : "Calculate Full Breakdown"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Estimates are for planning only. Final eligibility is confirmed during filing.
      </p>
    </div>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      {children}
    </div>
  );
}
