"use client";

import { useMemo, useState, useTransition } from "react";
import { unlockTaxPlanByEmail, unlockTaxPlanForFiling } from "./actions";

type Status =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function UnlockTaxPlanPage() {
  const [email, setEmail] = useState("");
  const [cognitoSub, setCognitoSub] = useState("");

  const [status, setStatus] = useState<Status>({ type: "idle" });

  // Separate pending states so each section behaves independently
  const [pendingEmail, startEmailTransition] = useTransition();
  const [pendingSub, startSubTransition] = useTransition();

  const emailLower = useMemo(() => normalizeEmail(email), [email]);
  const canUnlockByEmail = useMemo(
    () => isValidEmail(emailLower) && !pendingEmail,
    [emailLower, pendingEmail]
  );

  const subTrimmed = useMemo(() => cognitoSub.trim(), [cognitoSub]);
  const canUnlockBySub = useMemo(
    () => subTrimmed.length > 0 && !pendingSub,
    [subTrimmed, pendingSub]
  );

  function clearStatusIfTyping() {
    if (status.type !== "idle") setStatus({ type: "idle" });
  }

  return (
    <main className="mx-auto max-w-xl space-y-8 p-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Tax Plan Unlock Tool</h1>
        <p className="text-sm text-muted-foreground">
          Use after confirming payment, or when a client begins filing (includes full access).
        </p>
      </header>

      {/* Unlock by Email */}
      <section className="space-y-4 rounded-2xl border bg-background/90 p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Unlock by Email</h2>
          <p className="text-sm text-muted-foreground">
            Use after Drake Pay, invoice, or manual payment is confirmed.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Client email</label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="client@email.com"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearStatusIfTyping();
            }}
          />
          {email.length > 0 && !isValidEmail(emailLower) ? (
            <p className="text-xs text-destructive">Enter a valid email address.</p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={!canUnlockByEmail}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition
                     hover:opacity-95 hover:shadow-md
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2
                     disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => {
            startEmailTransition(() => {
              void (async () => {
                try {
                  setStatus({ type: "idle" });

                  // Optional confirm (prevents accidental unlocks)
                  const ok = confirm(`Unlock tax plan for: ${emailLower}?`);
                  if (!ok) return;

                  await unlockTaxPlanByEmail(emailLower);

                  setStatus({
                    type: "success",
                    message: "✅ Tax plan unlocked (paid) for this user.",
                  });

                  setEmail("");
                } catch (err: any) {
                  setStatus({
                    type: "error",
                    message: err?.message ?? "Failed to unlock tax plan.",
                  });
                }
              })();
            });
          }}
        >
          {pendingEmail ? "Unlocking…" : "Mark Paid & Unlock"}
        </button>
      </section>

      {/* Unlock for Filing */}
      <section className="space-y-4 rounded-2xl border bg-background/90 p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Unlock for Filing</h2>
          <p className="text-sm text-muted-foreground">
            Use when onboarding starts / engagement letter signed. Marks filing client + unlocks all features.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Cognito sub</label>
          <input
            type="text"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={cognitoSub}
            onChange={(e) => {
              setCognitoSub(e.target.value);
              clearStatusIfTyping();
            }}
          />
        </div>

        <button
          type="button"
          disabled={!canUnlockBySub}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition
                     hover:opacity-95 hover:shadow-md
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:ring-offset-2
                     disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => {
            startSubTransition(() => {
              void (async () => {
                try {
                  setStatus({ type: "idle" });

                  const ok = confirm(`Unlock for filing (includes paid access) for this Cognito sub?`);
                  if (!ok) return;

                  await unlockTaxPlanForFiling(subTrimmed);

                  setStatus({
                    type: "success",
                    message: "✅ User marked as filing client + tax plan unlocked.",
                  });

                  setCognitoSub("");
                } catch (err: any) {
                  setStatus({
                    type: "error",
                    message: err?.message ?? "Failed to unlock filing access.",
                  });
                }
              })();
            });
          }}
        >
          {pendingSub ? "Unlocking…" : "Unlock for Filing"}
        </button>
      </section>

      {/* Status */}
      {status.type !== "idle" && (
        <div
          aria-live="polite"
          className={`rounded-xl border p-4 text-sm ${
            status.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {status.message}
        </div>
      )}
    </main>
  );
}
