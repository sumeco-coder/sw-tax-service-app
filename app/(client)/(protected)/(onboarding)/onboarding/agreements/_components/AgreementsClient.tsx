"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AGREEMENT_TEXT,
  AGREEMENT_TITLES,
  type AgreementKind,
} from "@/lib/legal/agreements";
import { signAgreement, submitAgreementsAndFinish } from "../actions";

const BRAND = {
  pink: "#E62A68",
  copper: "#BB4E2B",
};

type Decision = "SIGNED" | "GRANTED" | "DECLINED" | "SKIPPED";

type SignedRow = {
  decision: Decision | null;
  taxpayerSignedAt: string | null;
  spouseRequired: boolean;
  spouseSignedAt: string | null;
};

type Initial = Record<AgreementKind, SignedRow | null>;

const KINDS: AgreementKind[] = ["ENGAGEMENT", "CONSENT_7216_USE", "CONSENT_PAYMENT"];

// ✅ deterministic formatter (prevents hydration mismatch)
const dtf = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function fmt(dt: string | null) {
  if (!dt) return "";
  try {
    return dtf.format(new Date(dt));
  } catch {
    return "";
  }
}

function isDone(row: SignedRow | null) {
  return Boolean(row?.taxpayerSignedAt);
}

function isRequiredDone(row: SignedRow | null) {
  if (!row?.taxpayerSignedAt) return false;
  if (!row.spouseRequired) return true;
  return Boolean(row.spouseSignedAt);
}

export default function AgreementsClient({
  initial,
  taxYear,
}: {
  initial: Initial;
  taxYear: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [step, setStep] = useState<number>(0);

  // Shared name fields
  const [taxpayerName, setTaxpayerName] = useState<string>("");
  const [spouseRequired, setSpouseRequired] = useState<boolean>(false);
  const [spouseName, setSpouseName] = useState<string>("");

  // Consent selection (7216)
  const [consentChoice, setConsentChoice] = useState<Decision>(() => {
    const d = initial.CONSENT_7216_USE?.decision ?? "SKIPPED";
    return (d as Decision) || "SKIPPED";
  });

  const [err, setErr] = useState<string>("");
  const [signed, setSigned] = useState<Initial>(initial);

  const engagementDone = useMemo(() => isRequiredDone(signed.ENGAGEMENT), [signed]);
  const consentDone = useMemo(() => isDone(signed.CONSENT_7216_USE), [signed]);
  const paymentDone = useMemo(() => isRequiredDone(signed.CONSENT_PAYMENT), [signed]);

  const consentDeclined = useMemo(
    () => (signed.CONSENT_7216_USE?.decision ?? consentChoice) === "DECLINED",
    [signed, consentChoice]
  );

  const canOpenConsent = engagementDone;
  const canOpenPayment = engagementDone && consentDone && !consentDeclined;

  // ✅ can submit only when all complete AND not declined
  const canSubmit =
    engagementDone &&
    paymentDone &&
    consentDone &&
    !consentDeclined;

  // keep step inside allowed range
  const effectiveStep = useMemo(() => {
    const max = engagementDone ? (consentDone ? (canOpenPayment ? 2 : 1) : 1) : 0;
    return Math.min(step, max);
  }, [step, engagementDone, consentDone, canOpenPayment]);

  function Badge({ open }: { open: boolean }) {
    return (
      <span
        className={[
          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
          open ? "text-white" : "bg-white/70 text-slate-700 ring-black/10",
        ].join(" ")}
        style={
          open
            ? { background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }
            : undefined
        }
      >
        {open ? "Open" : "Locked"}
      </span>
    );
  }

  async function doSign(kind: AgreementKind, decisionOverride?: Decision) {
    setErr("");

    const name = taxpayerName.trim();
    const spouse = spouseName.trim();

    if (name.length < 5) {
      setErr("Enter taxpayer full legal name.");
      return;
    }
    if (spouseRequired && spouse.length < 5) {
      setErr("Enter spouse full legal name.");
      return;
    }

    const decision: Decision =
      decisionOverride ??
      (kind === "CONSENT_7216_USE" ? consentChoice : "SIGNED");

    startTransition(async () => {
      try {
        await signAgreement({
          kind,
          taxpayerName: name,
          spouseRequired,
          spouseName: spouseRequired ? spouse : undefined,
          decision,
        });

        // optimistic local update
        const nowIso = new Date().toISOString();
        setSigned((prev) => ({
          ...prev,
          [kind]: {
            decision,
            taxpayerSignedAt: nowIso,
            spouseRequired,
            spouseSignedAt: spouseRequired ? nowIso : null,
          },
        }));

        if (kind === "ENGAGEMENT") setStep(1);
        if (kind === "CONSENT_7216_USE") setStep(2);

        router.refresh();
      } catch (e: any) {
        setErr(e?.message ?? "Failed to save.");
      }
    });
  }

  function StepHeader({
    title,
    required,
    done,
    open,
    onClick,
    subtitle,
    signedAt,
  }: {
    title: string;
    required?: boolean;
    done: boolean;
    open: boolean;
    onClick: () => void;
    subtitle?: string;
    signedAt: string | null;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!open}
        className={[
          "w-full text-left rounded-2xl border px-4 py-3 transition",
          open ? "bg-white hover:bg-slate-50" : "bg-white/70",
        ].join(" ")}
        style={{
          borderColor: open ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {title} {required ? <span className="text-red-600">*</span> : null}
            </p>

            {done ? (
              <p className="text-xs text-slate-700">
                Completed ✓{" "}
                <span className="text-slate-600">({fmt(signedAt)})</span>
              </p>
            ) : (
              <p className="text-xs text-slate-700">{subtitle ?? "Not completed yet"}</p>
            )}
          </div>

          <Badge open={open} />
        </div>
      </button>
    );
  }

  const activeKind = KINDS[effectiveStep];

  const activeTitle =
    activeKind === "ENGAGEMENT"
      ? `1) ${AGREEMENT_TITLES.ENGAGEMENT}`
      : activeKind === "CONSENT_7216_USE"
      ? `2) ${AGREEMENT_TITLES.CONSENT_7216_USE}`
      : `3) ${AGREEMENT_TITLES.CONSENT_PAYMENT}`;

  return (
    <div className="space-y-6">
      <header
        className="rounded-2xl border bg-white p-5"
        style={{ borderColor: "rgba(0,0,0,0.10)" }}
      >
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Agreements
        </h1>
        <p className="mt-1 text-sm text-slate-700">
          Tax Year: <span className="font-semibold text-slate-900">{taxYear}</span>
        </p>

        {consentDeclined ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            You selected <b>“I do not consent”</b> for 7216. The portal cannot continue.
            Please contact SW Tax Service for next steps.
          </div>
        ) : null}

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        ) : null}
      </header>

      {/* Step list */}
      <div className="grid gap-3 md:grid-cols-3">
        <StepHeader
          title={`1) ${AGREEMENT_TITLES.ENGAGEMENT}`}
          required
          done={engagementDone}
          open={true}
          onClick={() => setStep(0)}
          signedAt={signed.ENGAGEMENT?.taxpayerSignedAt ?? null}
        />

        <StepHeader
          title={`2) ${AGREEMENT_TITLES.CONSENT_7216_USE}`}
          done={consentDone}
          open={canOpenConsent}
          onClick={() => setStep(1)}
          subtitle="Optional — choose consent/decline, or skip."
          signedAt={signed.CONSENT_7216_USE?.taxpayerSignedAt ?? null}
        />

        <StepHeader
          title={`3) ${AGREEMENT_TITLES.CONSENT_PAYMENT}`}
          required
          done={paymentDone}
          open={canOpenPayment}
          onClick={() => setStep(2)}
          subtitle={
            !consentDone ? "Complete step 2 first." : consentDeclined ? "Blocked." : "Not completed yet"
          }
          signedAt={signed.CONSENT_PAYMENT?.taxpayerSignedAt ?? null}
        />
      </div>

      {/* Shared identity fields */}
      <section
        className="rounded-2xl border bg-white p-5"
        style={{ borderColor: "rgba(0,0,0,0.10)" }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-900">
              Taxpayer full legal name <span className="text-red-600">*</span>
            </label>
            <input
              value={taxpayerName}
              onChange={(e) => setTaxpayerName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E62A68]/25 focus:border-[#E62A68]/40"
              placeholder="First Last"
              required
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#E62A68]"
                checked={spouseRequired}
                onChange={(e) => setSpouseRequired(e.target.checked)}
              />
              Married filing jointly (spouse signs)
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-900">
              Spouse full legal name{" "}
              {spouseRequired ? <span className="text-red-600">*</span> : null}
            </label>
            <input
              value={spouseName}
              onChange={(e) => setSpouseName(e.target.value)}
              disabled={!spouseRequired}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E62A68]/25 focus:border-[#E62A68]/40 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="First Last"
              required={spouseRequired}
            />
          </div>

          <div className="hidden md:block" />
        </div>
      </section>

      {/* Active agreement viewer + action */}
      <section
        className="rounded-2xl border bg-white p-5"
        style={{ borderColor: "rgba(0,0,0,0.10)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{activeTitle}</h2>

            {activeKind === "CONSENT_7216_USE" ? (
              <p className="mt-1 text-xs text-slate-700">
                Optional — choose consent/decline, or skip.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-700">Required — sign to continue.</p>
            )}
          </div>
        </div>

        {/* Consent dropdown */}
        {activeKind === "CONSENT_7216_USE" ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-slate-900">Your choice</label>
            <select
              value={consentChoice}
              onChange={(e) => setConsentChoice(e.target.value as any)}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E62A68]/25 focus:border-[#E62A68]/40"
              disabled={pending}
            >
              <option value="SKIPPED">Skip for now</option>
              <option value="GRANTED">I consent</option>
              <option value="DECLINED">I do not consent</option>
            </select>
          </div>
        ) : null}

        {/* Agreement text */}
        <div className="mt-4 max-h-[420px] overflow-auto rounded-2xl border bg-slate-50 p-4">
          <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-900">
            {AGREEMENT_TEXT[activeKind] ?? ""}
          </pre>
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex flex-wrap gap-2">
          {activeKind === "ENGAGEMENT" ? (
            <button
              type="button"
              onClick={() => doSign("ENGAGEMENT", "SIGNED")}
              disabled={pending}
              className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }}
            >
              {pending ? "Saving..." : "Sign engagement letter"}
            </button>
          ) : null}

          {activeKind === "CONSENT_7216_USE" ? (
            <button
              type="button"
              onClick={() => doSign("CONSENT_7216_USE", consentChoice)}
              disabled={pending || !engagementDone}
              className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }}
            >
              {pending ? "Saving..." : "Save consent choice"}
            </button>
          ) : null}

          {activeKind === "CONSENT_PAYMENT" ? (
            <button
              type="button"
              onClick={() => doSign("CONSENT_PAYMENT", "SIGNED")}
              disabled={pending || !canOpenPayment}
              className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }}
            >
              {pending ? "Saving..." : "Sign payment consent"}
            </button>
          ) : null}

          {/* ✅ Final Submit → /profile */}
          <form action={submitAgreementsAndFinish}>
            <button
              type="submit"
              disabled={!canSubmit || pending}
              className="cursor-pointer rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Submit and finish
            </button>
          </form>
        </div>

        {/* tiny status */}
        <div className="mt-3 text-xs text-slate-700">
          {engagementDone ? "Engagement: ✓ " : "Engagement: — "}
          ·{" "}
          {consentDone ? (
            <>
              7216: ✓{" "}
              <span className="font-semibold">
                ({signed.CONSENT_7216_USE?.decision ?? consentChoice})
              </span>
            </>
          ) : (
            "7216: —"
          )}
          · {paymentDone ? " Payment: ✓" : " Payment: —"}
        </div>
      </section>
    </div>
  );
}
