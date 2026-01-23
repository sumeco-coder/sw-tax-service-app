import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

import CompleteButton from "./_components/CompleteButton";
import { completeOnboarding } from "./actions";

const BRAND = {
  primary: "#E00040",
  accent: "#B04020",
  dark: "#202030",
};

function oneParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function safeInternalPath(input: string | null | undefined, fallback: string) {
  const raw = (input ?? "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("://")) return fallback;
  return raw;
}

function normalizePostOnboardingTarget(path: string) {
  if (path.startsWith("/onboarding")) return "/dashboard";
  return path;
}

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function OnboardingCompletePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  /* ───────────────────────── HARD GUARD ───────────────────────── */

  const cookieStore = await cookies();
  const idToken = cookieStore.get("idToken")?.value;

  if (!idToken) {
    redirect("/sign-in");
  }

  let sub: string | undefined;
  try {
    sub = (decodeJwt(idToken!) as any)?.sub;
  } catch {
    redirect("/sign-in");
  }

  if (!sub) {
    redirect("/sign-in");
  }

  const [user] = await db
    .select({ onboardingStep: users.onboardingStep })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  // 🔒 STOP re-render loop forever
  if (user?.onboardingStep === "DONE") {
    redirect("/dashboard");
  }

  /* ───────────────────────── PAGE LOGIC ───────────────────────── */

  const sp = await searchParams;

  const nextParam = oneParam(sp.next);
  const intendedAfterOnboarding = normalizePostOnboardingTarget(
    safeInternalPath(nextParam, "/dashboard")
  );

  const formId = "complete-onboarding-form";

  return (
    <main
      className="min-h-screen px-4 py-10"
      style={{
        background: `radial-gradient(1200px 600px at 20% 0%, ${BRAND.primary}22, transparent 60%),
                     radial-gradient(900px 500px at 80% 10%, ${BRAND.accent}22, transparent 55%),
                     linear-gradient(180deg, ${BRAND.dark} 0%, #0b0b14 40%, #f8fafc 100%)`,
      }}
    >
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <header className="mb-4 text-center">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: BRAND.primary }}
            >
              Taxpayer onboarding
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              You&apos;re all set for now
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              We&apos;ve received your onboarding information. If you booked a
              review call, it&apos;s scheduled. Your tax pro will review
              everything and reach out if anything else is needed.
            </p>
          </header>

          <div
            className="mb-5 rounded-2xl p-4 text-white shadow-sm ring-1 ring-black/5"
            style={{
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                ✓
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold">Onboarding submitted</p>
                <p className="mt-1 text-xs text-white/85">
                  You can upload more documents anytime, even after submitting.
                </p>
              </div>
            </div>
          </div>

          <section className="space-y-3 text-sm text-slate-700">
            <p>
              From your dashboard, you&apos;ll be able to upload extra documents,
              view messages from your tax pro, and track the status of your
              return.
            </p>

            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
              <li>Upload any additional W-2s, 1099s, or supporting documents.</li>
              <li>Check for messages or requests from your tax pro.</li>
              <li>See when your return is ready to review and e-sign.</li>
            </ul>
          </section>

          <form id={formId} action={completeOnboarding} className="mt-6">
            <input type="hidden" name="next" value={intendedAfterOnboarding} />
            <CompleteButton formId={formId} />
          </form>

          <p className="mt-3 text-[11px] text-center text-slate-500">
            You can come back and update your information anytime by signing in
            to your account.
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] text-white/70">
          Need help? Contact support and we’ll walk you through it.
        </p>
      </div>
    </main>
  );
}
