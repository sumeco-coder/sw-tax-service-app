// app/(site)/_components/TaxCalculatorClient.tsx
"use client";

import { useState } from "react";
import CalculatorShell from "../_components/CalculatorShell";
import { isUnlocked } from "@/lib/access/accessState";

export default function TaxCalculatorClient() {
  const [access, setAccess] = useState<{
    hasPaidForPlan?: boolean;
    filingClient?: boolean;
  }>({
    hasPaidForPlan: false,
    filingClient: false,
  });

  const unlocked = isUnlocked(access);

  return (
    <main className="relative mx-auto max-w-5xl px-4 py-12">
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/20 via-sky-400/20 to-emerald-400/20 blur-3xl" />
      </div>

      {/* Header */}
      <header className="mx-auto max-w-2xl space-y-4 text-center">
        <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          2025 Federal • IRS-Aligned
        </span>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Federal Income Tax Calculator
        </h1>

        <p className="text-base text-muted-foreground">
          Estimate your federal taxes, self-employment tax, and quarterly payments using current IRS rules — no login
          required.
        </p>
      </header>

      {/* Calculator Card */}
      <section className="mx-auto mt-10 max-w-3xl">
        <div className="rounded-2xl border bg-background/80 shadow-sm backdrop-blur">
          <div className="p-6 sm:p-8">
            <CalculatorShell
              access={access}
              unlocked={unlocked}
              onUnlock={() =>
                setAccess({
                  hasPaidForPlan: true,
                  filingClient: false,
                })
              }
            />
          </div>
        </div>
      </section>

      {/* Trust / Footer */}
      <footer className="mx-auto mt-10 max-w-3xl space-y-2 border-t pt-6 text-center text-xs text-muted-foreground">
        <p>Estimates are for planning purposes only and are not a filed tax return.</p>
        <p>
          Calculations based on 2025 IRS guidance. Results may vary based on individual circumstances.
        </p>
      </footer>
    </main>
  );
}
