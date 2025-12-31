// app/(client)/onboarding/questions/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import { saveQuestions } from "./actions";
import { useFormStatus } from "react-dom";
import { RadioPill, QuestionsYesNo } from "./_components/QuestionYesNo";
import {
  DependentForm,
  emptyDependent,
  type DependentInput,
} from "./_components/DependentForm";

configureAmplify();

type UserIdentity = { sub: string; email: string };
type StepId = 1 | 2 | 3 | 4;

export default function OnboardingQuestionsPage() {
  const [me, setMe] = useState<UserIdentity | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<StepId>(1);

  const [filingStatus, setFilingStatus] = useState("");
  const [hasDependents, setHasDependents] = useState<"yes" | "no" | "">("");

  const [dependentsCount, setDependentsCount] = useState<string>("");
  const [dependents, setDependents] = useState<DependentInput[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        const session = await fetchAuthSession();
        const tokenEmail =
          (session.tokens?.idToken?.payload["email"] as string | undefined) ?? "";
        const email =
          tokenEmail || (u.signInDetails?.loginId as string | undefined) || "";
        setMe({ sub: u.userId, email });
      } catch (err) {
        console.error(err);
        setError("You must be signed in to continue onboarding.");
      } finally {
        setLoadingUser(false);
      }
    })();
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

  if (loadingUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your onboarding…</p>
      </main>
    );
  }

  if (error || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-2xl bg-card p-6 text-card-foreground shadow-sm ring-1 ring-border">
          <h1 className="text-lg font-semibold text-foreground">
            Sign in required
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ??
              "We couldn’t find your session. Please sign in again to continue."}
          </p>
          <a
            href="/sign-in"
            className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Go to sign-in
          </a>
        </div>
      </main>
    );
  }

  function goNext() {
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
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Step 3 of 4
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              A few questions about your taxes
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              These help your tax pro spot deductions and credits you may qualify for.
              If you’re not sure on something, you can leave it blank.
            </p>
          </div>

          <div className="rounded-2xl bg-card/80 px-4 py-3 text-right shadow-sm ring-1 ring-border">
            <p className="text-xs font-medium text-muted-foreground">
              Onboarding step
            </p>
            <p className="text-sm font-semibold text-foreground">
              Questions in progress
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              You can save and come back anytime.
            </p>
          </div>
        </header>

        <nav className="mb-6 flex items-center justify-between gap-2 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border">
          {stepsMeta.map((s) => {
            const isActive = s.id === step;
            const isCompleted = s.id < step;
            return (
              <div key={s.id} className="flex flex-1 items-center gap-2 text-xs">
                <div
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ring-1",
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
                      "font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
            );
          })}
        </nav>

        <form
          action={saveQuestions}
          className="space-y-6 rounded-2xl bg-card p-6 text-card-foreground shadow-sm ring-1 ring-border"
        >
          <input type="hidden" name="cognitoSub" value={me.sub} />
          <input type="hidden" name="email" value={me.email} />
          <input type="hidden" name="dependentsJson" value={dependentsJson} />

          {/* STEP 1 */}
          <section hidden={step !== 1} className="space-y-5">
            <h2 className="text-sm font-semibold text-foreground">
              Filing status & household
            </h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                What filing status do you expect to use?
              </label>
              <select
                name="filingStatus"
                value={filingStatus}
                onChange={(e) => setFilingStatus(e.target.value)}
                className={[
                  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background",
                  "focus:ring-2 focus:ring-ring",
                  filingStatus ? "text-foreground" : "text-muted-foreground",
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
                onChange={(e) => handleDependentsCountChange(e.target.value)}
                placeholder="0"
                disabled={hasDependents !== "yes"}
                className={[
                  "w-36 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none",
                  "focus:ring-2 focus:ring-ring",
                  hasDependents !== "yes" ? "cursor-not-allowed" : "",
                ].join(" ")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                If you’re not sure, leave it blank — you can still add dependents below.
              </p>
            </div>

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
            <h2 className="text-sm font-semibold text-foreground">Income sources</h2>

            <QuestionsYesNo name="workedW2" label="Did you work a job and receive any W-2s?" />
            <QuestionsYesNo name="hasSelfEmployment" label="Did you have self-employment income?" />
            <QuestionsYesNo name="hasGigIncome" label="Did you earn gig income (Uber, DoorDash, etc.)?" />
            <QuestionsYesNo name="hasInvestments" label="Did you have stock/crypto/investment income?" />
            <QuestionsYesNo name="hasRetirement" label="Did you receive retirement income or pensions?" />
            <QuestionsYesNo name="hasUnemployment" label="Did you receive unemployment benefits?" />
            <QuestionsYesNo name="hasOtherIncome" label="Did you have other income (rental, gambling, etc.)?" />
          </section>

          {/* STEP 3 */}
          <section hidden={step !== 3} className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Deductions & credits</h2>

            <QuestionsYesNo name="paidChildcare" label="Did you pay for childcare/daycare so you could work?" />
            <QuestionsYesNo name="paidEducation" label="Did you pay for college or job training?" />
            <QuestionsYesNo name="hasStudentLoans" label="Do you have student loans with interest payments?" />
            <QuestionsYesNo name="hadMedicalExpenses" label="Did you have significant medical/dental expenses?" />
            <QuestionsYesNo name="donatedToCharity" label="Did you donate money or items to charity?" />
            <QuestionsYesNo name="ownsHome" label="Do you own a home or pay mortgage interest/property taxes?" />
            <QuestionsYesNo name="contributedRetirement" label="Did you contribute to a retirement account?" />
          </section>

          {/* STEP 4 */}
          <section hidden={step !== 4} className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Life events & goals</h2>

            <QuestionsYesNo name="movedLastYear" label="Did you move to a new address last year?" />

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Did you get married or divorced last year?
              </label>
              <select
                name="marriageDivorce"
                defaultValue=""
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No change</option>
                <option value="married">Got married</option>
                <option value="divorced">Got divorced</option>
                <option value="separated">Legally separated</option>
              </select>
            </div>

            <QuestionsYesNo name="hadBaby" label="Did you have a baby or add a child to your household?" />
            <QuestionsYesNo name="gotIrsLetter" label="Did you receive IRS/state letters or notices?" />

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                What is the #1 thing you want your tax pro to focus on?
              </label>
              <select
                name="mainGoal"
                defaultValue=""
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Choose one (optional)</option>
                <option value="maxRefund">Maximize my refund</option>
                <option value="lowerTax">Lower what I owe & avoid surprises</option>
                <option value="fixWithholding">Fix my withholdings for next year</option>
                <option value="businessDeductions">Dial in my business deductions</option>
                <option value="irsLetters">Help with IRS/state letters</option>
                <option value="other">Something else</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Anything else you want us to know? (optional)
              </label>
              <textarea
                name="extraNotes"
                rows={4}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder="Tell us anything special: side income, concerns, life changes…"
              />
            </div>
          </section>

          <NavButtons step={step} goBack={goBack} goNext={goNext} />
        </form>

        <p className="mt-4 text-[11px] text-muted-foreground text-center">
          You can update these answers later if something changes.
        </p>
      </div>
    </main>
  );
}

function NavButtons(props: { step: StepId; goBack: () => void; goNext: () => void }) {
  const { pending } = useFormStatus();

  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={props.goBack}
        disabled={props.step === 1 || pending}
        className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        ← Back
      </button>

      {props.step < 4 ? (
        <button
          type="button"
          onClick={props.goNext}
          disabled={pending}
          className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Next step →
        </button>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save & continue to scheduling"}
        </button>
      )}
    </div>
  );
}
