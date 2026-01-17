// app/(site)/_components/EmailGate.tsx
"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const sp = useSearchParams();

  const [email, setEmail] = useState(state.email ?? "");
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const emailTrimmed = useMemo(() => email.trim(), [email]);
  const emailLower = useMemo(() => email.trim().toLowerCase(), [email]);

  const canSubmit = useMemo(
    () => isValidEmail(emailLower) && !saving,
    [emailLower, saving]
  );

  const utm = useMemo(() => {
    const pick = (k: string) => sp.get(k) ?? undefined;
    return {
      utm_source: pick("utm_source"),
      utm_medium: pick("utm_medium"),
      utm_campaign: pick("utm_campaign"),
      utm_term: pick("utm_term"),
      utm_content: pick("utm_content"),
    };
  }, [sp]);

  const source = useMemo(() => {
    return (sp.get("source") ?? "").trim() || "tax-calculator";
  }, [sp]);


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
           email: emailTrimmed,
          snapshot,
             utm,
          source,
          marketingOptIn,
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

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
          />
          Email me tax updates (optional)
        </label>

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
