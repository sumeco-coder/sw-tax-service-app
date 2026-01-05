// app/(site)/_components/EmailGate.tsx
"use client";

import { useMemo, useState } from "react";
import type { CalculatorState } from "./types";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function EmailGate({
  state,
  onSubmit,
}: {
  state: CalculatorState;
  onSubmit: (email: string) => void;
}) {
  const [email, setEmail] = useState(state.email ?? "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const emailLower = useMemo(() => email.trim().toLowerCase(), [email]);
  const canSubmit = useMemo(
    () => isValidEmail(emailLower) && !saving,
    [emailLower, saving]
  );

  async function handleSubmit() {
    setErr("");

    if (!isValidEmail(emailLower)) {
      setErr("Enter a valid email address.");
      return;
    }

    // Safe snapshot (no SSNs)
    const snapshot = {
      filingStatus: state.filingStatus,
      w2Income: state.w2Income,
      selfEmployedIncome: state.selfEmployedIncome,
      withholding: state.withholding,
      dependentsCount: state.dependentsCount ?? 0,
      otherDependentsCount: state.otherDependentsCount ?? 0,
      useMultiW2: Boolean(state.w2s && state.w2s.length > 1),
      w2sCount: state.w2s?.length ?? 0,
    };

    try {
      setSaving(true);

      const res = await fetch("/api/tax-calculator/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailLower,
          snapshot,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Could not save email.");
      }

      onSubmit(emailLower);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">Get Your Results</h2>
        <p className="text-sm text-muted-foreground">
          We’ll send your estimate summary and your saved inputs.
        </p>
      </div>

      <div className="space-y-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
        />

        {err ? <p className="text-sm text-destructive">{err}</p> : null}
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void handleSubmit()}
        className="w-full rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-sm transition
                   hover:shadow-md hover:opacity-95
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : "View Results"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        No spam. You can unsubscribe anytime.
      </p>
    </div>
  );
}
