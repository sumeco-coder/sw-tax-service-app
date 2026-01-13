// app/(client)/(protected)/(onboarding)/onboarding/questions/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { saveQuestions } from "./actions";
import { useFormStatus } from "react-dom";
import { RadioPill, QuestionsYesNo } from "./_components/QuestionYesNo";
import {
  DependentForm,
  emptyDependent,
  type DependentInput,
} from "./_components/DependentForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type StepId = 1 | 2 | 3 | 4;

/** Keep server cookies in sync (so server actions can trust session cookies) */
async function ensureServerSession() {
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();
  const accessToken = session.tokens?.accessToken?.toString();

  if (!idToken || !accessToken) return null;

  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({ idToken, accessToken }),
  });

  if (!res.ok) return null;
  return session;
}

export default function OnboardingQuestionsPage() {
  const formRef = useRef<HTMLFormElement | null>(null);

  const [step, setStep] = useState<StepId>(1);

  const [filingStatus, setFilingStatus] = useState("");
  const [hasDependents, setHasDependents] = useState<"yes" | "no" | "">("");

  const [dependentsCount, setDependentsCount] = useState<string>("");
  const [dependents, setDependents] = useState<DependentInput[]>([]);

  useEffect(() => {
    // keep cookies fresh for server actions (safe no-op if already set)
    ensureServerSession().catch(() => {});
  }, []);

  const stepsMeta = [
    { id: 1 as StepId, label: "Filing & household" },
    { id: 2 as StepId, label: "Income sources" },
    { id: 3 as StepId, label: "Deductions & credits" },
    { id: 4 as StepId, label: "Life events & goals" },
  ];

  const dependentsJson = useMemo(() => {
    if (hasDependents !== "yes") return "";
    return JSON.stringify(dependents ?? []);
  }, [dependents, hasDependents]);

  function validateCurrentStep() {
    // This validates ONLY currently-required inputs (we set required per-step below)
    if (!formRef.current) return true;
    return formRef.current.reportValidity();
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setStep((prev) => (prev < 4 ? ((prev + 1) as StepId) : prev));
  }

  function goBack() {
    setStep((prev) => (prev > 1 ? ((prev - 1) as StepId) : prev));
  }

  function handleDependentsChoice(v: "yes" | "no") {
    setHasDependents(v);

    if (v === "no") {
      setDependentsCount("");
      setDependents([]);
      return;
    }

    // If they flip to yes and none exist yet, start with 1 for good UX
    setDependents((prev) => (prev.length ? prev : [emptyDependent()]));
  }

  function handleDependentsCountChange(v: string) {
    setDependentsCount(v);

    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return;

    // cap auto-create to avoid "999"
    const target = Math.min(Math.floor(n), 10);

    // only auto-add (never auto-delete)
    setDependents((prev) => {
      if (hasDependents !== "yes") return prev;
      if (target <= prev.length) return prev;

      const add = Array.from({ length: target - prev.length }, () =>
        emptyDependent()
      );
      return [...prev, ...add];
    });
  }

  function addDependent() {
    if (hasDependents !== "yes") return;
    setDependents((prev) => [...prev, emptyDependent()]);
  }

  function removeDependent(clientId: string) {
    setDependents((prev) => prev.filter((d) => d.clientId !== clientId));
  }

  function updateDependent(clientId: string, patch: Partial<DependentInput>) {
    setDependents((prev) =>
      prev.map((d) => (d.clientId === clientId ? { ...d, ...patch } : d))
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Step 3 of 6</Badge>
            <Badge className="bg-primary text-primary-foreground">
              Questions
            </Badge>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            A few questions about your taxes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            These help your tax pro spot deductions and credits you may qualify
            for. If you’re not sure, you can leave things blank.
          </p>
        </div>

        {/* Stepper */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              {stepsMeta.map((s) => {
                const isActive = s.id === step;
                const isCompleted = s.id < step;

                return (
                  <div key={s.id} className="flex flex-1 items-center gap-2">
                    <div
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ring-1",
                        isActive
                          ? "bg-primary text-primary-foreground ring-primary/30"
                          : isCompleted
                            ? "bg-secondary text-foreground ring-border"
                            : "bg-muted text-muted-foreground ring-border",
                      ].join(" ")}
                    >
                      {s.id}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={[
                          "text-xs font-medium",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {s.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <form ref={formRef} action={saveQuestions} className="space-y-6">
          <input type="hidden" name="dependentsJson" value={dependentsJson} />

          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {stepsMeta.find((s) => s.id === step)?.label}
              </CardTitle>
              <CardDescription>
                Answer what you can — you can update later if something changes.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* STEP 1 */}
              <section hidden={step !== 1} className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    What filing status do you expect to use?
                  </label>

                  <select
                    name="filingStatus"
                    value={filingStatus}
                    onChange={(e) => setFilingStatus(e.target.value)}
                    className={[
                      "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none",
                      "focus:ring-2 focus:ring-ring",
                      filingStatus
                        ? "text-foreground"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    <option value="" disabled>
                      Select one…
                    </option>
                    <option value="single">Single</option>
                    <option value="mfj">Married filing jointly</option>
                    <option value="mfs">Married filing separately</option>
                    <option value="hoh">Head of household</option>
                    <option value="qw">Qualifying widow(er)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Do you have any dependents you may claim?
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <RadioPill
                      name="hasDependents"
                      value="yes"
                      checked={hasDependents === "yes"}
                      onChange={() => handleDependentsChoice("yes")}
                    >
                      Yes
                    </RadioPill>

                    <RadioPill
                      name="hasDependents"
                      value="no"
                      checked={hasDependents === "no"}
                      onChange={() => handleDependentsChoice("no")}
                    >
                      No
                    </RadioPill>
                  </div>
                </div>

                <div className={hasDependents === "yes" ? "" : "opacity-60"}>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    If yes, how many dependents?
                  </label>

                  <input
                    type="number"
                    min={0}
                    name="dependentsCount"
                    value={dependentsCount}
                    onChange={(e) =>
                      handleDependentsCountChange(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    placeholder="0"
                    disabled={hasDependents !== "yes"}
                    className={[
                      "h-10 w-40 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none",
                      "focus:ring-2 focus:ring-ring",
                      hasDependents !== "yes" ? "cursor-not-allowed" : "",
                    ].join(" ")}
                  />

                  <p className="mt-1 text-xs text-muted-foreground">
                    If you’re not sure, leave it blank — you can still add
                    dependents below.
                  </p>
                </div>

                <Separator />

                <DependentForm
                  enabled={hasDependents === "yes"}
                  dependentsCount={dependentsCount}
                  dependents={dependents}
                  onAdd={addDependent}
                  onRemove={removeDependent}
                  onChange={updateDependent}
                />
              </section>

              {/* STEP 2 */}
              <section hidden={step !== 2} className="space-y-4">
                <QuestionsYesNo
                  required
                  name="workedW2"
                  label="Did you work a job and receive any W-2s?"
                />
                <QuestionsYesNo
                  required
                  name="hasSelfEmployment"
                  label="Did you have self-employment income?"
                />
                <QuestionsYesNo
                  required
                  name="hasGigIncome"
                  label="Did you earn gig income (Uber, DoorDash, etc.)?"
                />
                <QuestionsYesNo
                  required
                  name="hasInvestments"
                  label="Did you have stock/crypto/investment income?"
                />
                <QuestionsYesNo
                  required
                  name="hasRetirement"
                  label="Did you receive retirement income or pensions?"
                />
                <QuestionsYesNo
                  required
                  name="hasUnemployment"
                  label="Did you receive unemployment benefits?"
                />
                <QuestionsYesNo
                  required
                  name="hasOtherIncome"
                  label="Did you have other income (rental, gambling, etc.)?"
                />
              </section>

              {/* STEP 3 */}
              <section hidden={step !== 3} className="space-y-4">
                <QuestionsYesNo
                  required
                  name="paidChildcare"
                  label="Did you pay for childcare/daycare so you could work?"
                />
                <QuestionsYesNo
                  required
                  name="paidEducation"
                  label="Did you pay for college or job training?"
                />
                <QuestionsYesNo
                  required
                  name="hasStudentLoans"
                  label="Do you have student loans with interest payments?"
                />
                <QuestionsYesNo
                  required
                  name="hadMedicalExpenses"
                  label="Did you have significant medical/dental expenses?"
                />
                <QuestionsYesNo
                  required
                  name="donatedToCharity"
                  label="Did you donate money or items to charity?"
                />
                <QuestionsYesNo
                  required
                  name="ownsHome"
                  label="Do you own a home or pay mortgage interest/property taxes?"
                />
                <QuestionsYesNo
                  required
                  name="contributedRetirement"
                  label="Did you contribute to a retirement account?"
                />
              </section>

              {/* STEP 4 */}
              <section hidden={step !== 4} className="space-y-4">
                <QuestionsYesNo
                  required
                  name="movedLastYear"
                  label="Did you move to a new address last year?"
                />

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Did you get married or divorced last year?
                  </label>
                  <select
                    name="marriageDivorce"
                    defaultValue=""
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">No change</option>
                    <option value="married">Got married</option>
                    <option value="divorced">Got divorced</option>
                    <option value="separated">Legally separated</option>
                  </select>
                </div>

                <QuestionsYesNo
                  required
                  name="hadBaby"
                  label="Did you have a baby or add a child to your household?"
                />
                <QuestionsYesNo
                  required
                  name="gotIrsLetter"
                  label="Did you receive IRS/state letters or notices?"
                />

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    What is the #1 thing you want your tax pro to focus on?
                  </label>
                  <select
                    name="mainGoal"
                    defaultValue=""
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Choose one (optional)</option>
                    <option value="maxRefund">Maximize my refund</option>
                    <option value="lowerTax">
                      Lower what I owe & avoid surprises
                    </option>
                    <option value="fixWithholding">
                      Fix my withholdings for next year
                    </option>
                    <option value="businessDeductions">
                      Dial in my business deductions
                    </option>
                    <option value="irsLetters">
                      Help with IRS/state letters
                    </option>
                    <option value="other">Something else</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Anything else you want us to know? (optional)
                  </label>
                  <Textarea
                    name="extraNotes"
                    rows={4}
                    className="rounded-xl"
                    placeholder="Tell us anything special: side income, concerns, life changes…"
                  />
                </div>
              </section>

              <NavButtons step={step} goBack={goBack} goNext={goNext} />
            </CardContent>
          </Card>
        </form>

        <p className="text-[11px] text-muted-foreground text-center">
          You can update these answers later if something changes.
        </p>
      </div>
    </main>
  );
}

function NavButtons(props: {
  step: StepId;
  goBack: () => void;
  goNext: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={props.goBack}
        disabled={props.step === 1 || pending}
      >
        ← Back
      </Button>

      {props.step < 4 ? (
        <Button
          type="button"
          className="rounded-xl"
          onClick={props.goNext}
          disabled={pending}
        >
          Next step →
        </Button>
      ) : (
        <Button type="submit" className="rounded-xl" disabled={pending}>
          {pending ? "Saving…" : "Save & continue to scheduling"}
        </Button>
      )}
    </div>
  );
}
