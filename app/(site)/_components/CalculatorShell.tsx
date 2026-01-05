"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QuickEstimate from "./QuickEstimate";
import EmailGate from "./EmailGate";
import QuickResults from "./QuickResults";
import DetailedCalculator from "./DetailedCalculator";
import FinalResults from "./FinalResults";
import type { CalculatorState, AccessState } from "./types";

type Step = "quick" | "email" | "estimate" | "detailed" | "final";

const STORAGE_KEY = "sw_tax_calc_state_v1";

export default function CalculatorShell({
  access,
  unlocked,
  onUnlock,
}: {
  access: AccessState;
  unlocked: boolean;
  onUnlock: () => void;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [step, setStep] = useState<Step>("quick");
  const [localUnlocked, setLocalUnlocked] = useState(false);

  const effectiveUnlocked = useMemo(
    () => Boolean(unlocked || localUnlocked),
    [unlocked, localUnlocked]
  );

  const [state, setState] = useState<CalculatorState>({
    filingStatus: "single",
    w2Income: 0,
    selfEmployedIncome: 0,
    withholding: 0,
    dependentsCount: 0,
    otherDependentsCount: 0,
    additionalWithholding: 0,
    w2s: [],
    email: "",
  });

  // ✅ resume after Stripe success (or cancel) + restore state
  useEffect(() => {
    const resume = sp.get("resume") === "1";
    const unlockedParam = sp.get("unlocked") === "1";
    if (unlockedParam) setLocalUnlocked(true);

    if (!resume) return;

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { step?: Step; state?: CalculatorState };
      if (parsed?.state) setState(parsed.state);
      if (parsed?.step) setStep(parsed.step);
      else setStep("final");
    } catch {
      // ignore
    }
  }, [sp]);

  // ✅ persist state whenever it changes (so redirect doesn’t lose it)
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, state }));
    } catch {
      // ignore
    }
  }, [step, state]);

  function handleUnlock() {
    // ensure we have email for Stripe
    const email = state.email?.trim();
    if (!email) {
      // push them to email step if missing
      setStep("email");
      return;
    }

    const qs = new URLSearchParams({ product: "tax-plan", email });
    router.push(`/checkout?${qs.toString()}`);
  }

  return (
    <div className="relative space-y-8">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <StepDot active={step === "quick"} />
        <StepDot active={step === "email"} />
        <StepDot active={step === "estimate"} />
        <StepDot active={step === "detailed" || step === "final"} />
      </div>

      <h2 className="text-center text-xl font-semibold">
        {step === "quick" && "Quick Estimate"}
        {step === "email" && "Get Your Results"}
        {step === "estimate" && "Your Estimate"}
        {step === "detailed" && "Full Inputs"}
        {step === "final" && "Full Breakdown"}
      </h2>

      <div className="rounded-2xl border bg-background/90 shadow-sm backdrop-blur">
        <div className="p-6 sm:p-8 space-y-6">
          {step === "quick" && (
            <QuickEstimate
              state={state}
              onNext={(s) => {
                setState(s);
                setStep("email");
              }}
            />
          )}

          {step === "email" && (
            <EmailGate
              state={state}
              onSubmit={(email) => {
                setState((s) => ({ ...s, email }));
                setStep("estimate");
              }}
            />
          )}

          {step === "estimate" && (
            <QuickResults
              state={state}
              onBack={() => setStep("quick")}
              onUpgrade={() => setStep("detailed")}
            />
          )}

          {step === "detailed" && (
            <DetailedCalculator
              state={state}
              onChange={setState}
              onCalculate={() => setStep("final")}
            />
          )}

          {step === "final" && (
            <section id="results">
              <FinalResults
                state={state}
                access={access}
                unlocked={effectiveUnlocked}
                onUnlock={handleUnlock}
              />
            </section>
          )}
        </div>
      </div>

      {step === "final" && !effectiveUnlocked && (
        <div className="fixed bottom-4 inset-x-4 z-40 sm:hidden">
          <button className="btn-primary w-full shadow-lg" onClick={handleUnlock}>
            Unlock Full Tax Plan
          </button>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Used by W-2 individuals, self-employed individuals, freelancers, and small businesses nationwide.
      </p>
    </div>
  );
}

function StepDot({ active }: { active: boolean }) {
  return (
    <span className={`h-2 w-2 rounded-full transition ${active ? "bg-primary" : "bg-muted"}`} />
  );
}
