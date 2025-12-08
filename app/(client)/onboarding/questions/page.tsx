// app/(client)/onboarding/questions/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import { saveQuestions } from "./actions";

configureAmplify();

type UserIdentity = {
  sub: string;
  email: string;
};

type StepId = 1 | 2 | 3 | 4;

export default function OnboardingQuestionsPage() {
  const [me, setMe] = useState<UserIdentity | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<StepId>(1);
  const [submitting, setSubmitting] = useState(false);

  // Load Cognito user
  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        const session = await fetchAuthSession();
        const tokenEmail =
          (session.tokens?.idToken?.payload["email"] as string | undefined) ??
          "";
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

  if (loadingUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading your onboarding…</p>
      </main>
    );
  }

  if (error || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl bg-white p-6 shadow">
          <h1 className="text-lg font-semibold text-slate-900">
            Sign in required
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {error ??
              "We couldn’t find your session. Please sign in again to continue."}
          </p>
          <a
            href="/sign-in"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      await saveQuestions(formData);
      // redirect happens inside server action
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      alert("Something went wrong saving your answers. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Step 3 of 4
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              A few questions about your taxes
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              These help your tax pro spot deductions and credits you may
              qualify for. If you’re not sure on something, just pick “Not sure”
              or leave it blank.
            </p>
          </div>

          <div className="rounded-xl bg-white/80 px-4 py-3 text-right shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-medium text-slate-500">Onboarding step</p>
            <p className="text-sm font-semibold text-emerald-700">
              Questions in progress
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              You can save and come back anytime.
            </p>
          </div>
        </header>

        {/* Step indicator */}
        <nav className="mb-6 flex items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
          {stepsMeta.map((s) => {
            const isActive = s.id === step;
            const isCompleted = s.id < step;
            return (
              <div
                key={s.id}
                className="flex flex-1 items-center gap-2 text-xs"
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : isCompleted
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {s.id}
                </div>
                <div className="hidden sm:block">
                  <p
                    className={`font-medium ${
                      isActive
                        ? "text-slate-900"
                        : isCompleted
                        ? "text-slate-700"
                        : "text-slate-500"
                    }`}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Form (single form, multi-step UI) */}
        <form action={handleSubmit} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {/* Hidden identity fields for server action */}
          <input type="hidden" name="cognitoSub" value={me.sub} />
          <input type="hidden" name="email" value={me.email} />

          {/* STEP 1: Filing & household */}
          {step === 1 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Filing status & household
              </h2>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  What filing status do you expect to use?
                </label>
                <select
                  name="filingStatus"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Not sure yet</option>
                  <option value="single">Single</option>
                  <option value="mfj">Married filing jointly</option>
                  <option value="mfs">Married filing separately</option>
                  <option value="hoh">Head of household</option>
                  <option value="qw">Qualifying widow(er)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Do you have any dependents you may claim?
                </label>
                <div className="flex gap-3 text-sm">
                  <label className="inline-flex items-center gap-1">
                    <input type="radio" name="hasDependents" value="yes" />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input type="radio" name="hasDependents" value="no" />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  If yes, how many dependents?
                </label>
                <input
                  type="number"
                  min={0}
                  name="dependentsCount"
                  placeholder="0"
                  className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </section>
          )}

          {/* STEP 2: Income sources */}
          {step === 2 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Income sources
              </h2>

              <QuestionYesNo
                name="workedW2"
                label="Did you work a job and receive any W-2s?"
              />

              <QuestionYesNo
                name="hasSelfEmployment"
                label="Did you run a small business, do freelance work, or have self-employment income?"
              />

              <QuestionYesNo
                name="hasGigIncome"
                label="Did you earn money from gig apps (Uber, DoorDash, Instacart, OnlyFans, Etsy, etc.)?"
              />

              <QuestionYesNo
                name="hasInvestments"
                label="Did you have stock, crypto, or investment income (1099-B, dividends, interest)?"
              />

              <QuestionYesNo
                name="hasRetirement"
                label="Did you receive retirement income or pensions (Social Security, 1099-R, etc.)?"
              />

              <QuestionYesNo
                name="hasUnemployment"
                label="Did you receive unemployment benefits (1099-G)?"
              />

              <QuestionYesNo
                name="hasOtherIncome"
                label="Did you have any other income like rental property, gambling winnings, or settlements?"
              />
            </section>
          )}

          {/* STEP 3: Deductions & credits */}
          {step === 3 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Deductions & credits
              </h2>

              <QuestionYesNo
                name="paidChildcare"
                label="Did you pay for childcare, daycare, or after-school care so you could work?"
              />

              <QuestionYesNo
                name="paidEducation"
                label="Did you pay for college or job training (you or dependents)?"
              />

              <QuestionYesNo
                name="hasStudentLoans"
                label="Do you have student loans with interest payments?"
              />

              <QuestionYesNo
                name="hadMedicalExpenses"
                label="Did you have significant out-of-pocket medical or dental expenses?"
              />

              <QuestionYesNo
                name="donatedToCharity"
                label="Did you donate money, clothes, or other items to charity?"
              />

              <QuestionYesNo
                name="ownsHome"
                label="Do you own a home or pay mortgage interest/property taxes?"
              />

              <QuestionYesNo
                name="contributedRetirement"
                label="Did you contribute to a retirement account (401k, IRA, etc.)?"
              />
            </section>
          )}

          {/* STEP 4: Life events & goals */}
          {step === 4 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Life events & goals
              </h2>

              <QuestionYesNo
                name="movedLastYear"
                label="Did you move to a new address last year?"
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Did you get married or divorced last year?
                </label>
                <select
                  name="marriageDivorce"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">No change</option>
                  <option value="married">Got married</option>
                  <option value="divorced">Got divorced</option>
                  <option value="separated">Legally separated</option>
                </select>
              </div>

              <QuestionYesNo
                name="hadBaby"
                label="Did you have a baby or add a new child to your household last year?"
              />

              <QuestionYesNo
                name="gotIrsLetter"
                label="Did you receive any letters or notices from the IRS or state tax agency?"
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  What is the #1 thing you want your tax pro to focus on?
                </label>
                <select
                  name="mainGoal"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  <option value="irsLetters">Help with IRS or state letters</option>
                  <option value="other">Something else</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Anything else you want us to know? (optional)
                </label>
                <textarea
                  name="extraNotes"
                  rows={4}
                  placeholder="Tell us about any special situations, side income, or concerns you have."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </section>
          )}

          {/* Navigation buttons */}
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || submitting}
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ← Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={submitting}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next step →
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save & continue to scheduling"}
              </button>
            )}
          </div>
        </form>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          You can update these answers later by contacting SW Tax Service if
          something changes.
        </p>
      </div>
    </main>
  );
}

/** Small reusable Yes/No component */
function QuestionYesNo(props: { name: string; label: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {props.label}
      </label>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="inline-flex items-center gap-1">
          <input type="radio" name={props.name} value="yes" />
          <span>Yes</span>
        </label>
        <label className="inline-flex items-center gap-1">
          <input type="radio" name={props.name} value="no" />
          <span>No</span>
        </label>
        <label className="inline-flex items-center gap-1">
          <input type="radio" name={props.name} value="unsure" />
          <span>Not sure</span>
        </label>
      </div>
    </div>
  );
}
