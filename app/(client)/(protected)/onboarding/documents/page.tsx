// app/(client)/onboarding/documents/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import { saveDocuments } from "./actions";
import DocumentUploader from "../_components/DocumentUploader";
import DocumentList from "../_components/DocumentList";
import { useFormStatus } from "react-dom";

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
  const [submitError, setSubmitError] = useState<string | null>(null);

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
        setError("We couldn’t find your session. Please sign in again.");
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your documents step…</p>
      </main>
    );
  }

  if (error || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-2xl bg-card p-6 text-card-foreground shadow-sm ring-1 ring-border">
          <h1 className="text-lg font-semibold text-foreground">Sign in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "We couldn’t find your session. Please sign in again to continue onboarding."}
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-card p-6 text-card-foreground shadow-sm ring-1 ring-border">
          {/* Header */}
          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Step 2 of 4
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">
              Upload your tax documents
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              These documents help us prepare your return accurately and avoid delays.
            </p>
          </header>

          {/* Info panel */}
          <div className="mb-5 rounded-2xl border border-border bg-secondary/60 px-4 py-3">
            <p className="text-xs font-semibold text-foreground">How to send your documents</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload clear photos or PDFs in your portal. If something is missing, you can still
              continue and upload more later.
            </p>
          </div>

          {/* Upload area */}
          <section className="mb-6 space-y-4">
            <DocumentUploader cognitoSub={me.sub} />
            <DocumentList cognitoSub={me.sub} />
          </section>

          {/* Form (so redirect() works) */}
          <form
            action={saveDocuments}
            onSubmit={(e) => {
              if (!acknowledged) {
                e.preventDefault();
                setSubmitError(
                  "Please confirm you’ve uploaded or gathered your documents before continuing."
                );
                return;
              }
              setSubmitError(null);
            }}
            className="space-y-4"
          >
            {/* optional fallback; server action should trust cookies */}
            <input type="hidden" name="cognitoSub" value={me.sub} />
            <input type="hidden" name="email" value={me.email} />

            {/* Checklist */}
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-sm font-semibold text-foreground">Common documents to upload</p>

              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Photo ID</span> (Driver’s license,
                    state ID, or passport)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Social Security cards</span> for
                    you and all dependents
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Income forms</span> (W-2, 1099,
                    1099-NEC, unemployment, etc.)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Credits & deductions</span>{" "}
                    (childcare, tuition 1098-T, student loan interest, donations, medical, etc.)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                  <span>
                    <span className="font-medium text-foreground">Prior-year return</span> (if you
                    filed last year)
                  </span>
                </li>
              </ul>
            </div>

            {/* Acknowledgement */}
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="acknowledged"
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                  checked={acknowledged}
                  onChange={(e) => {
                    setAcknowledged(e.target.checked);
                    if (e.target.checked) setSubmitError(null);
                  }}
                />
                <span className="text-muted-foreground">
                  I’ve uploaded or gathered my documents, or I’ll finish uploading them before my
                  review call.
                </span>
              </label>

              {submitError && <p className="mt-2 text-xs text-destructive">{submitError}</p>}
            </div>

            <ContinueButton />
            <p className="text-center text-[11px] text-muted-foreground">
              You can come back later to upload additional documents if something changes.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

function ContinueButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Continue to questions"}
    </button>
  );
}
