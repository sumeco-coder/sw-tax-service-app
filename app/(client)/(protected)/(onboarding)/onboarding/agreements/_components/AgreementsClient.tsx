"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AGREEMENT_TEXT,
  AGREEMENT_TITLES,
  type AgreementKind,
} from "@/lib/legal/agreements";
import { signAgreement, submitAgreementsAndFinish } from "../actions";

// shadcn
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormStatus } from "react-dom";

type Decision = "SIGNED" | "GRANTED" | "DECLINED" | "SKIPPED";

type SignedRow = {
  decision: Decision | null;
  taxpayerSignedAt: string | null;
  spouseRequired: boolean;
  spouseSignedAt: string | null;
};

type Initial = Record<AgreementKind, SignedRow | null>;

const KINDS: AgreementKind[] = [
  "ENGAGEMENT",
  "CONSENT_7216_USE",
  "CONSENT_PAYMENT",
];

// deterministic formatter (prevents hydration mismatch)
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

function errMessage(code: string | null) {
  if (!code) return "";
  switch (code) {
    case "incomplete":
      return "Please complete all required agreements to continue.";
    case "consent_declined":
      return "You selected “I do not consent.” The onboarding cannot continue.";
    case "wrong_step":
      return "You’re not on the Agreements step yet. Please return to the onboarding summary.";
    case "auth_failed":
      return "Your session may have expired. Please sign in again.";
    case "db_read_failed":
      return "We couldn’t verify your agreements right now. Please refresh and try again.";
    case "save_failed":
      return "We couldn’t save your final submission. Please refresh and try again.";
    default:
      return "Something went wrong. Please refresh and try again.";
  }
}

export default function AgreementsClient({
  initial,
  taxYear,
  errorCode,
}: {
  initial: Initial;
  taxYear: string;
  errorCode?: string | null;
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

  const [err, setErr] = useState<string>(() => errMessage(errorCode ?? null));
  const [signed, setSigned] = useState<Initial>(initial);

  const engagementDone = useMemo(
    () => isRequiredDone(signed.ENGAGEMENT),
    [signed]
  );
  const consentDone = useMemo(
    () => isDone(signed.CONSENT_7216_USE),
    [signed]
  );
  const paymentDone = useMemo(
    () => isRequiredDone(signed.CONSENT_PAYMENT),
    [signed]
  );

  const consentDeclined = useMemo(
    () => (signed.CONSENT_7216_USE?.decision ?? consentChoice) === "DECLINED",
    [signed, consentChoice]
  );

  const canOpenConsent = engagementDone;
  const canOpenPayment = engagementDone && consentDone && !consentDeclined;

  const canSubmit = engagementDone && paymentDone && consentDone && !consentDeclined;

  // keep step inside allowed range
  const effectiveStep = useMemo(() => {
    const max = engagementDone ? (consentDone ? (canOpenPayment ? 2 : 1) : 1) : 0;
    return Math.min(step, max);
  }, [step, engagementDone, consentDone, canOpenPayment]);

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

  function StepCard({
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
          "w-full text-left rounded-2xl border p-4 transition",
          open ? "bg-background hover:bg-muted/40" : "bg-muted/30 opacity-80",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {title} {required ? <span className="text-destructive">*</span> : null}
            </p>

            {done ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Completed ✓ <span className="text-muted-foreground/80">({fmt(signedAt)})</span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                {subtitle ?? "Not completed yet"}
              </p>
            )}
          </div>

          <Badge
            variant={open ? "default" : "secondary"}
            className={open ? "bg-gradient-to-br from-[#E62A68] to-[#BB4E2B] text-white" : ""}
          >
            {open ? "Open" : "Locked"}
          </Badge>
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
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Agreements</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tax Year: <span className="font-semibold text-foreground">{taxYear}</span>
          </p>

          {consentDeclined ? (
            <Alert className="mt-4" variant="destructive">
              <AlertTitle>Consent declined</AlertTitle>
              <AlertDescription>
                You selected <b>“I do not consent”</b> for 7216. The portal cannot
                continue. Please contact SW Tax Service for next steps.
              </AlertDescription>
            </Alert>
          ) : null}

          {err ? (
            <Alert className="mt-4" variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          ) : null}
        </CardHeader>
      </Card>

      {/* Step list */}
      <div className="grid gap-3 md:grid-cols-3">
        <StepCard
          title={`1) ${AGREEMENT_TITLES.ENGAGEMENT}`}
          required
          done={engagementDone}
          open={true}
          onClick={() => setStep(0)}
          signedAt={signed.ENGAGEMENT?.taxpayerSignedAt ?? null}
        />

        <StepCard
          title={`2) ${AGREEMENT_TITLES.CONSENT_7216_USE}`}
          done={consentDone}
          open={canOpenConsent}
          onClick={() => setStep(1)}
          subtitle="Optional — choose consent/decline, or skip."
          signedAt={signed.CONSENT_7216_USE?.taxpayerSignedAt ?? null}
        />

        <StepCard
          title={`3) ${AGREEMENT_TITLES.CONSENT_PAYMENT}`}
          required
          done={paymentDone}
          open={canOpenPayment}
          onClick={() => setStep(2)}
          subtitle={
            !consentDone
              ? "Complete step 2 first."
              : consentDeclined
                ? "Blocked."
                : "Not completed yet"
          }
          signedAt={signed.CONSENT_PAYMENT?.taxpayerSignedAt ?? null}
        />
      </div>

      {/* Shared identity fields */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Signer details</CardTitle>
          <p className="text-xs text-muted-foreground">
            Enter names exactly as they should appear for signing.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">
              Taxpayer full legal name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={taxpayerName}
              onChange={(e) => setTaxpayerName(e.target.value)}
              placeholder="First Last"
              className="rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 pt-6 md:pt-0">
            <Checkbox
              checked={spouseRequired}
              onCheckedChange={(v) => setSpouseRequired(Boolean(v))}
              id="spouseRequired"
            />
            <Label htmlFor="spouseRequired" className="text-xs font-semibold">
              Married filing jointly (spouse signs)
            </Label>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Spouse full legal name{" "}
              {spouseRequired ? <span className="text-destructive">*</span> : null}
            </Label>
            <Input
              value={spouseName}
              onChange={(e) => setSpouseName(e.target.value)}
              disabled={!spouseRequired}
              placeholder="First Last"
              className="rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Active agreement viewer + actions */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">{activeTitle}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {activeKind === "CONSENT_7216_USE"
              ? "Optional — choose consent/decline, or skip."
              : "Required — sign to continue."}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Consent select */}
          {activeKind === "CONSENT_7216_USE" ? (
            <div className="flex flex-wrap items-center gap-3">
              <Label className="text-xs font-semibold">Your choice</Label>

              <Select
                value={consentChoice}
                onValueChange={(v) => setConsentChoice(v as Decision)}
                disabled={pending}
              >
                <SelectTrigger className="w-[220px] rounded-xl">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SKIPPED">Skip for now</SelectItem>
                  <SelectItem value="GRANTED">I consent</SelectItem>
                  <SelectItem value="DECLINED">I do not consent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/* Agreement text */}
          <ScrollArea className="h-[420px] rounded-2xl border bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap text-sm leading-6">
              {AGREEMENT_TEXT[activeKind] ?? ""}
            </pre>
          </ScrollArea>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2">
            {activeKind === "ENGAGEMENT" ? (
              <Button
                type="button"
                onClick={() => doSign("ENGAGEMENT", "SIGNED")}
                disabled={pending}
                className="rounded-xl bg-gradient-to-br from-[#E62A68] to-[#BB4E2B] text-white hover:opacity-95"
              >
                {pending ? "Saving..." : "Sign engagement letter"}
              </Button>
            ) : null}

            {activeKind === "CONSENT_7216_USE" ? (
              <Button
                type="button"
                onClick={() => doSign("CONSENT_7216_USE", consentChoice)}
                disabled={pending || !engagementDone}
                className="rounded-xl bg-gradient-to-br from-[#E62A68] to-[#BB4E2B] text-white hover:opacity-95"
              >
                {pending ? "Saving..." : "Save consent choice"}
              </Button>
            ) : null}

            {activeKind === "CONSENT_PAYMENT" ? (
              <Button
                type="button"
                onClick={() => doSign("CONSENT_PAYMENT", "SIGNED")}
                disabled={pending || !canOpenPayment}
                className="rounded-xl bg-gradient-to-br from-[#E62A68] to-[#BB4E2B] text-white hover:opacity-95"
              >
                {pending ? "Saving..." : "Sign payment consent"}
              </Button>
            ) : null}

            {/* Final submit (form action is OK because server action never throws now) */}
            <form action={submitAgreementsAndFinish}>
              <FinalSubmitButton disabled={!canSubmit || pending} />
            </form>
          </div>

          {/* tiny status */}
          <div className="text-xs text-muted-foreground">
            {engagementDone ? "Engagement: ✓ " : "Engagement: — "}
            ·{" "}
            {consentDone ? (
              <>
                7216: ✓{" "}
                <span className="font-semibold text-foreground">
                  ({signed.CONSENT_7216_USE?.decision ?? consentChoice})
                </span>
              </>
            ) : (
              "7216: —"
            )}
            · {paymentDone ? " Payment: ✓" : " Payment: —"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FinalSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      className="rounded-xl"
      disabled={disabled || pending}
    >
      {pending ? "Submitting..." : "Submit and finish"}
    </Button>
  );
}
