// app/(client)/onboarding/agreements/_components/AgreementsClient.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AGREEMENT_TEXT, AGREEMENT_TITLES } from "@/lib/legal/agreements";
import { finalizeAgreementsAndSubmit, signAgreement } from "../actions";

type Kind = "ENGAGEMENT" | "CONSENT_7216_USE" | "CONSENT_PAYMENT";

type SignedInfo = {
  decision: string | null; // SIGNED | GRANTED | DECLINED | SKIPPED
  taxpayerSignedAt: string | null;
  spouseRequired: boolean;
  spouseSignedAt: string | null;
};

export default function AgreementsClient({
  initial,
  taxYear,
}: {
  initial: Record<Kind, SignedInfo | null>;
  taxYear?: string;
}) {
  const [signed, setSigned] = useState<Record<Kind, SignedInfo | null>>(initial);

  // ✅ Start spouse toggle based on any existing signature record
  const initialSpouseRequired =
    Boolean(initial.ENGAGEMENT?.spouseRequired) ||
    Boolean(initial.CONSENT_PAYMENT?.spouseRequired) ||
    Boolean(initial.CONSENT_7216_USE?.spouseRequired);

  const [spouseRequired, setSpouseRequired] = useState<boolean>(initialSpouseRequired);
  const [taxpayerName, setTaxpayerName] = useState("");
  const [spouseName, setSpouseName] = useState("");

  const [agreeChecked, setAgreeChecked] = useState(false);

  const [consentChoice, setConsentChoice] = useState<
    "GRANTED" | "DECLINED" | "SKIPPED"
  >("SKIPPED");

  // ✅ Fix step logic:
  // 0 = engagement
  // 1 = 7216 consent (optional)
  // 2 = payment + submit
  const [step, setStep] = useState<0 | 1 | 2>(() => {
    const engDone =
      Boolean(initial.ENGAGEMENT?.taxpayerSignedAt) &&
      (!initial.ENGAGEMENT?.spouseRequired ||
        Boolean(initial.ENGAGEMENT?.spouseSignedAt));

    if (!engDone) return 0;

    const consentDone =
      Boolean(initial.CONSENT_7216_USE?.taxpayerSignedAt) ||
      initial.CONSENT_7216_USE?.decision === "SKIPPED";

    if (!consentDone) return 1;

    const payDone =
      Boolean(initial.CONSENT_PAYMENT?.taxpayerSignedAt) &&
      (!initial.CONSENT_PAYMENT?.spouseRequired ||
        Boolean(initial.CONSENT_PAYMENT?.spouseSignedAt));

    if (!payDone) return 2;

    return 2;
  });

  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const needNames = useMemo(() => {
    if (taxpayerName.trim().length < 5) return true;
    if (spouseRequired && spouseName.trim().length < 5) return true;
    return false;
  }, [taxpayerName, spouseName, spouseRequired]);

  const requiredOk = useMemo(() => {
    const e = signed.ENGAGEMENT;
    const p = signed.CONSENT_PAYMENT;

    const okE =
      Boolean(e?.taxpayerSignedAt) &&
      (!e?.spouseRequired || Boolean(e?.spouseSignedAt));

    const okP =
      Boolean(p?.taxpayerSignedAt) &&
      (!p?.spouseRequired || Boolean(p?.spouseSignedAt));

    return okE && okP;
  }, [signed]);

  function stamp(kind: Kind, info: SignedInfo) {
    setSigned((prev) => ({ ...prev, [kind]: info }));
  }

  async function doSign(
    kind: Kind,
    decision: "SIGNED" | "GRANTED" | "DECLINED" | "SKIPPED"
  ) {
    setError("");

    // ✅ For required documents, force electronic sign confirmation + names
    if (kind !== "CONSENT_7216_USE" || decision !== "SKIPPED") {
      if (!agreeChecked)
        throw new Error(
          "Please check the box to confirm you agree to sign electronically."
        );
      if (needNames) throw new Error("Please enter full legal name(s).");
    }

    // If they skip 7216, we do NOT store a signature (optional by law)
    if (kind === "CONSENT_7216_USE" && decision === "SKIPPED") {
      stamp(kind, {
        decision: "SKIPPED",
        taxpayerSignedAt: null,
        spouseRequired,
        spouseSignedAt: null,
      });
      return;
    }

    await signAgreement({
      kind,
      decision,
      taxpayerName: taxpayerName.trim(),
      spouseRequired,
      spouseName: spouseRequired ? spouseName.trim() : undefined,
    });

    const nowIso = new Date().toISOString();
    stamp(kind, {
      decision,
      taxpayerSignedAt: nowIso,
      spouseRequired,
      spouseSignedAt: spouseRequired ? nowIso : null,
    });
  }

  async function onEngagementNext() {
    startTransition(async () => {
      try {
        await doSign("ENGAGEMENT", "SIGNED");
        setStep(1);
      } catch (e: any) {
        setError(e?.message ?? "Failed to sign.");
      }
    });
  }

  async function onConsentNext() {
    startTransition(async () => {
      try {
        if (consentChoice === "SKIPPED") {
          await doSign("CONSENT_7216_USE", "SKIPPED");
        } else {
          await doSign("CONSENT_7216_USE", consentChoice);
        }
        setStep(2);
      } catch (e: any) {
        setError(e?.message ?? "Failed to continue.");
      }
    });
  }

  async function onPaymentSign() {
    startTransition(async () => {
      try {
        await doSign("CONSENT_PAYMENT", "SIGNED");
      } catch (e: any) {
        setError(e?.message ?? "Failed to sign.");
      }
    });
  }

  async function onSubmit() {
    startTransition(async () => {
      try {
        setError("");
        await finalizeAgreementsAndSubmit();
      } catch (e: any) {
        setError(e?.message ?? "Failed to submit.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Final step — Agreements
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Review & sign
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign your agreements to submit onboarding.
          {taxYear ? <span className="ml-2 text-xs">(Tax year: {taxYear})</span> : null}
        </p>
      </header>

      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Who is signing?</p>
            <p className="text-xs text-muted-foreground">
              If filing Married Filing Jointly, spouse must sign too.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={spouseRequired}
              onChange={(e) => setSpouseRequired(e.target.checked)}
            />
            Married filing jointly (spouse signs)
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-foreground">
              Taxpayer full legal name
            </label>
            <input
              value={taxpayerName}
              onChange={(e) => setTaxpayerName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="First Last"
            />
          </div>

          <div className={spouseRequired ? "" : "opacity-50"}>
            <label className="text-xs font-semibold text-foreground">
              Spouse full legal name
            </label>
            <input
              value={spouseName}
              onChange={(e) => setSpouseName(e.target.value)}
              disabled={!spouseRequired}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed"
              placeholder="First Last"
            />
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={agreeChecked}
            onChange={(e) => setAgreeChecked(e.target.checked)}
          />
          <span>
            I have read the document(s) and I intend to sign electronically.
            Date/time will be recorded automatically.
          </span>
        </label>
      </section>

      {/* STEP 1 */}
      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              1) {AGREEMENT_TITLES.ENGAGEMENT} (required)
            </p>
            {signed.ENGAGEMENT?.taxpayerSignedAt ? (
              <p className="text-xs text-muted-foreground">
                Signed ✓ ({new Date(signed.ENGAGEMENT.taxpayerSignedAt).toLocaleString()})
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Not signed yet</p>
            )}
          </div>

          <span
            className={[
              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
              step === 0
                ? "bg-primary/10 text-primary ring-primary/20"
                : "bg-muted text-muted-foreground ring-border",
            ].join(" ")}
          >
            {step === 0 ? "Open" : "Locked"}
          </span>
        </div>

        {step === 0 ? (
          <>
            <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-border bg-secondary/40 p-4 text-xs leading-5 text-foreground">
              {AGREEMENT_TEXT.ENGAGEMENT}
            </div>

            <button
              disabled={busy}
              onClick={onEngagementNext}
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Sign engagement & continue"}
            </button>
          </>
        ) : null}
      </section>

      {/* STEP 2 */}
      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              2) {AGREEMENT_TITLES.CONSENT_7216_USE}
            </p>
            <p className="text-xs text-muted-foreground">
              Optional — choose consent/decline, or skip.
            </p>
          </div>

          <span
            className={[
              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
              step === 1
                ? "bg-primary/10 text-primary ring-primary/20"
                : "bg-muted text-muted-foreground ring-border",
            ].join(" ")}
          >
            {step === 1 ? "Open" : "Locked"}
          </span>
        </div>

        {step === 1 ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 p-3">
              <p className="text-xs font-semibold text-foreground">Your choice</p>
              <select
                value={consentChoice}
                onChange={(e) => setConsentChoice(e.target.value as any)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
              >
                <option value="SKIPPED">Skip for now</option>
                <option value="GRANTED">I consent</option>
                <option value="DECLINED">I do not consent</option>
              </select>
            </div>

            <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-border bg-secondary/40 p-4 text-xs leading-5 text-foreground">
              {AGREEMENT_TEXT.CONSENT_7216_USE}
            </div>

            <button
              disabled={busy}
              onClick={onConsentNext}
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Continue to payment"}
            </button>
          </>
        ) : null}
      </section>

      {/* STEP 3 */}
      <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              3) {AGREEMENT_TITLES.CONSENT_PAYMENT} (required)
            </p>
            {signed.CONSENT_PAYMENT?.taxpayerSignedAt ? (
              <p className="text-xs text-muted-foreground">
                Signed ✓ ({new Date(signed.CONSENT_PAYMENT.taxpayerSignedAt).toLocaleString()})
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Not signed yet</p>
            )}
          </div>

          <span
            className={[
              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
              step === 2
                ? "bg-primary/10 text-primary ring-primary/20"
                : "bg-muted text-muted-foreground ring-border",
            ].join(" ")}
          >
            {step === 2 ? "Open" : "Locked"}
          </span>
        </div>

        {step === 2 ? (
          <>
            <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-border bg-secondary/40 p-4 text-xs leading-5 text-foreground">
              {AGREEMENT_TEXT.CONSENT_PAYMENT}
            </div>

            <button
              disabled={busy || Boolean(signed.CONSENT_PAYMENT?.taxpayerSignedAt)}
              onClick={onPaymentSign}
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy
                ? "Saving..."
                : signed.CONSENT_PAYMENT?.taxpayerSignedAt
                ? "Payment consent signed"
                : "Sign payment consent"}
            </button>

            <button
              disabled={busy || !requiredOk}
              onClick={onSubmit}
              className="inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Submitting..." : "Submit onboarding"}
            </button>

            <div className="text-[11px] text-muted-foreground text-center">
              You’ll be redirected after submission.
            </div>
          </>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <Link
          href="/onboarding/summary"
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary/40"
        >
          Back to summary
        </Link>
      </div>
    </div>
  );
}
