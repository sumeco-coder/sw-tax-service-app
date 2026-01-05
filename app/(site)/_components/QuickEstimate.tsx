"use client";

import { useMemo, useState } from "react";
import type { CalculatorState } from "./types";

function makeId(prefix = "w2") {
  // crypto.randomUUID in modern browsers; fallback for safety
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) return `${prefix}_${g.crypto.randomUUID()}`;
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function toMoney(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function toCount(v: unknown) {
  return Math.max(0, Math.floor(Number(v) || 0));
}

type W2Row = NonNullable<CalculatorState["w2s"]>[number];

export default function QuickEstimate({
  state,
  onNext,
}: {
  state: CalculatorState;
  onNext: (s: CalculatorState) => void;
}) {
  const initialTotal = useMemo(
    () => toMoney(state.w2Income) + toMoney(state.selfEmployedIncome),
    [state.w2Income, state.selfEmployedIncome]
  );

  const [filingStatus, setFilingStatus] = useState(state.filingStatus);

  // Simple mode inputs
  const [totalIncome, setTotalIncome] = useState<number>(initialTotal || 0);

  // 1099 toggle
  const [show1099, setShow1099] = useState<boolean>(toMoney(state.selfEmployedIncome) > 0);
  const [selfEmployedIncome, setSelfEmployedIncome] = useState<number>(toMoney(state.selfEmployedIncome));

  // Dependents
  const [dependentsCount, setDependentsCount] = useState<number>(toCount(state.dependentsCount ?? 0));

  // Other Dependents (ODC)
  const [otherDependentsCount, setOtherDependentsCount] = useState<number>(
    toCount(state.otherDependentsCount ?? 0)
  );

  // Multi-W2 toggle (TurboTax-style)
  const [useMultiW2, setUseMultiW2] = useState<boolean>(
    Boolean(state.w2s?.length && state.w2s.length > 1)
  );

  const [w2s, setW2s] = useState<W2Row[]>(
    state.w2s && state.w2s.length > 0
      ? state.w2s
      : [
          {
            id: makeId(),
            employerName: "",
            wages: toMoney(state.w2Income),
            federalWithholding: toMoney(state.withholding),
          },
        ]
  );

  // Extra withholding not on W-2 (optional)
  const [additionalWithholding, setAdditionalWithholding] = useState<number>(
    toMoney(state.additionalWithholding ?? 0)
  );

  // Simple withholding input (only used when NOT multi-W2)
  const [simpleWithholding, setSimpleWithholding] = useState<number>(toMoney(state.withholding ?? 0));

  const w2Totals = useMemo(() => {
    const wages = w2s.reduce((sum, r) => sum + toMoney(r.wages), 0);
    const wh = w2s.reduce((sum, r) => sum + toMoney(r.federalWithholding), 0);
    return {
      wages: Math.max(0, wages),
      withholding: Math.max(0, wh),
    };
  }, [w2s]);

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

  function updateW2(id: string, patch: Partial<W2Row>) {
    setW2s((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function toggleMultiW2() {
    setUseMultiW2((current) => {
      const next = !current;

      if (next) {
        // switching -> multi: seed a single W-2 from current simple values
        const total = toMoney(totalIncome);
        const se = show1099 ? Math.min(toMoney(selfEmployedIncome), total) : 0;
        const w2Income = Math.max(total - se, 0);

        setW2s([
          {
            id: makeId(),
            employerName: "",
            wages: w2Income,
            federalWithholding: toMoney(simpleWithholding),
          },
        ]);
        setAdditionalWithholding(0);
      } else {
        // switching -> simple: carry totals back into simple fields
        const total = w2Totals.wages + (show1099 ? toMoney(selfEmployedIncome) : 0);
        setTotalIncome(total);
        setSimpleWithholding(w2Totals.withholding + toMoney(additionalWithholding));
      }

      return next;
    });
  }

  function continueToEmail() {
    const seRaw = toMoney(selfEmployedIncome);
    const se = show1099 ? seRaw : 0;

    let w2Income = 0;
    let withholding = 0;

    if (useMultiW2) {
      w2Income = toMoney(w2Totals.wages);
      withholding = toMoney(w2Totals.withholding) + toMoney(additionalWithholding);
    } else {
      const total = toMoney(totalIncome);
      const cappedSe = Math.min(se, total);
      w2Income = Math.max(total - cappedSe, 0);

      // ✅ cleanup applied: only use simpleWithholding
      withholding = toMoney(simpleWithholding);
    }

    // Normalize W-2 rows for detailed step
    const normalizedW2s: W2Row[] = useMultiW2
      ? w2s.map((r) => ({
          ...r,
          employerName: (r.employerName ?? "").trim(),
          wages: toMoney(r.wages),
          federalWithholding: toMoney(r.federalWithholding),
        }))
      : [
          {
            id: makeId(),
            employerName: "",
            wages: w2Income,
            federalWithholding: toMoney(simpleWithholding),
          },
        ];

    onNext({
      ...state,
      filingStatus,
      w2Income,
      selfEmployedIncome: se,
      withholding,
      dependentsCount: toCount(dependentsCount),
      otherDependentsCount: toCount(otherDependentsCount),

      // seed detailed UI
      w2s: normalizedW2s,
      additionalWithholding: useMultiW2 ? toMoney(additionalWithholding) : 0,
    });
  }

  // Modern CTA pending guard
  const [pending, setPending] = useState(false);

  async function handleContinue() {
    if (pending) return;
    try {
      setPending(true);
      continueToEmail();
    } finally {
      // if component unmounts immediately, this doesn't matter—but it's correct
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1 text-center">
        <h3 className="text-2xl font-semibold tracking-tight">
          Estimate your federal refund in under 30 seconds
        </h3>
        <p className="text-sm text-muted-foreground">No SSNs. No login. Quick estimate only.</p>
      </div>

      <div className="grid gap-4">
        {/* Filing status */}
        <Field label="Filing status">
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
        </Field>

        {/* Multi W-2 toggle */}
        <button
          type="button"
          className="text-sm font-medium text-primary underline underline-offset-4 text-left"
          onClick={toggleMultiW2}
        >
          {useMultiW2 ? "Use simple income (one total)" : "Enter multiple W-2s (optional)"}
        </button>

        {/* W-2 input area */}
        {useMultiW2 ? (
          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">W-2s</p>
              <button type="button" className="btn-secondary" onClick={addW2}>
                + Add W-2
              </button>
            </div>

            <div className="space-y-3">
              {w2s.map((row, idx) => (
                <div key={row.id} className="rounded-lg border p-3 space-y-2">
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
                        onChange={(e) => updateW2(row.id, { wages: toMoney(e.target.value) })}
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
                          updateW2(row.id, { federalWithholding: toMoney(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total W-2 wages</span>
                <span className="font-semibold">${w2Totals.wages.toLocaleString()}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Total W-2 withholding</span>
                <span className="font-semibold">${w2Totals.withholding.toLocaleString()}</span>
              </div>
            </div>

            <Field
              label="Other federal withholding (optional)"
              helper="If you have federal withholding not on a W-2"
            >
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="$0"
                value={additionalWithholding === 0 ? "" : additionalWithholding}
                onChange={(e) => setAdditionalWithholding(toMoney(e.target.value))}
              />
            </Field>
          </div>
        ) : (
          <>
            {/* Total income (simple mode) */}
            <Field label="Total income" helper="W-2 + 1099 combined (rough is fine)">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="$0"
                value={totalIncome === 0 ? "" : totalIncome}
                onChange={(e) => setTotalIncome(toMoney(e.target.value))}
              />
            </Field>

            {/* Withholding (simple mode) */}
            <Field label="Federal withholding" helper="From paychecks/W-2 (rough estimate is ok)">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="$0"
                value={simpleWithholding === 0 ? "" : simpleWithholding}
                onChange={(e) => setSimpleWithholding(toMoney(e.target.value))}
              />
            </Field>
          </>
        )}

        {/* Optional 1099 */}
        <div className="space-y-2">
          <button
            type="button"
            className="text-sm font-medium text-primary underline underline-offset-4"
            onClick={() => setShow1099((v) => !v)}
          >
            {show1099 ? "Remove 1099/self-employment" : "Add 1099/self-employment income (optional)"}
          </button>

          {show1099 && (
            <Field label="1099 / self-employment income" helper="Net business income estimate (rough is fine).">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="$0"
                value={selfEmployedIncome === 0 ? "" : selfEmployedIncome}
                onChange={(e) => setSelfEmployedIncome(toMoney(e.target.value))}
              />
            </Field>
          )}
        </div>

        {/* Kids */}
        <Field
          label="Children under 17 (optional)"
          helper="Used only for a quick estimate. Verified during filing."
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="0"
            value={dependentsCount === 0 ? "" : dependentsCount}
            onChange={(e) => setDependentsCount(toCount(e.target.value))}
          />
        </Field>

        {/* Other Dependents */}
        <Field
          label="Other dependents (17+ / qualifying relatives) (optional)"
          helper="Used for ODC planning ($500 each, Schedule 8812). Verified during filing."
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="0"
            value={otherDependentsCount === 0 ? "" : otherDependentsCount}
            onChange={(e) => setOtherDependentsCount(toCount(e.target.value))}
          />
        </Field>
      </div>

      {/* CTA */}
      <button
        type="button"
        disabled={pending}
        onClick={() => void handleContinue()}
        className="group relative w-full overflow-hidden rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground
                   shadow-sm transition hover:shadow-md
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          <span className="text-lg">{pending ? "⏳" : "🔒"}</span>
          {pending ? "Continuing..." : "Get My Estimate"}
        </span>
        <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Estimates use simplified assumptions. Final eligibility is verified during filing.
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
