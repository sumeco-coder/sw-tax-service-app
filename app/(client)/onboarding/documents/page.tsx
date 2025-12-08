// app/(client)/onboarding/documents/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import { saveDocuments } from "./actions";
import DocumentUploader from "../_components/DocumentUploader";
import DocumentList from "../_components/DocumentList";

configureAmplify();

type UserIdentity = {
  sub: string;
  email: string;
};

export default function OnboardingDocumentsPage() {
  const [me, setMe] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

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
        setError("We couldn’t find your session. Please sign in again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleContinue() {
    if (!me) return;

    if (!acknowledged) {
      setSubmitError(
        "Please confirm you’ve uploaded or gathered your documents before continuing."
      );
      return;
    }

    setSubmitError(null);

    const formData = new FormData();
    formData.set("cognitoSub", me.sub);
    formData.set("acknowledged", acknowledged ? "on" : "");

    startTransition(async () => {
      try {
        // saveDocuments is a server action ("use server") in ./actions
        // It can perform DB writes and then redirect to the next step.
        await saveDocuments(formData);
      } catch (err) {
        console.error(err);
        setSubmitError(
          "Something went wrong saving your documents step. Please try again."
        );
      }
    });
  }

  if (loading || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading your documents step…</p>
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
              "We couldn’t find your session. Please sign in again to continue onboarding."}
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {/* Header */}
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Step 2 of 4
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Upload your tax documents
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            These documents help us prepare your return accurately and avoid
            delays with the IRS.
          </p>
        </header>

        {/* Info panel */}
        <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-xs text-slate-700 border border-blue-100">
          <p className="font-semibold text-blue-800">
            How to send your documents
          </p>
          <p className="mt-1">
            You can securely upload photos or PDFs of your forms in your SW Tax
            Service portal. Make sure everything is clear and readable.
          </p>
        </div>

        {/* Upload area */}
        <section className="mb-6 space-y-4">
          {/* Pass whatever props your components expect (user ID, etc.) */}
          <DocumentUploader cognitoSub={me.sub} />
          <DocumentList cognitoSub={me.sub} />
        </section>

        {/* Checklist + “I’m done” area */}
        <section className="space-y-4">
          {/* Checklist */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              Common documents to upload
            </p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded border border-slate-300 bg-slate-50" />
                <span>
                  <span className="font-medium">Photo ID</span> (Driver&apos;s
                  license, state ID, or passport)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded border border-slate-300 bg-slate-50" />
                <span>
                  <span className="font-medium">Social Security cards</span> for
                  you and all dependents
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded border border-slate-300 bg-slate-50" />
                <span>
                  <span className="font-medium">Income forms</span> (W-2, 1099,
                  1099-NEC, 1099-MISC, unemployment, etc.)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded border border-slate-300 bg-slate-50" />
                <span>
                  <span className="font-medium">Credits & deductions</span>{" "}
                  (childcare statements, tuition 1098-T, student loan interest,
                  donations, medical, etc.)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-4 w-4 rounded border border-slate-300 bg-slate-50" />
                <span>
                  <span className="font-medium">Prior-year return</span> (if
                  you filed last year)
                </span>
              </li>
            </ul>
          </div>

          {/* Acknowledgement checkbox */}
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <label className="flex items-start gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                name="acknowledged"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>
                I&apos;ve uploaded or gathered all of my documents, or I&apos;ll
                finish uploading them before my review call.
              </span>
            </label>
          </div>

          {/* Error message */}
          {submitError && (
            <p className="text-xs text-red-600 mt-2">{submitError}</p>
          )}

          {/* Continue button */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={isPending}
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Continue to questions"}
          </button>

          <p className="mt-2 text-[11px] text-slate-500 text-center">
            You can always come back later to upload additional documents if
            something changes.
          </p>
        </section>
      </div>
    </main>
  );
}
