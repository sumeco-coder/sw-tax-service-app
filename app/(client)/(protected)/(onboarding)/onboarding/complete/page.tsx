// app/(client)/onboarding/complete/page.tsx
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

const BRAND = {
  primary: "#E00040", // your summary pink/red
  accent: "#B04020", // your summary copper
  dark: "#202030",
};

/**
 * Server action: mark onboarding as DONE
 * Uses Cognito sub from idToken cookie.
 */
async function completeOnboarding(_formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const idToken = cookieStore.get("idToken")?.value;
  // If you store accessToken instead, swap this cookie name.

  if (!idToken) {
    console.error("completeOnboarding: no idToken cookie");
    redirect("/sign-in");
  }

  let sub: string | undefined;
  try {
    const decoded: any = decodeJwt(idToken!);
    sub = decoded?.sub as string | undefined;
  } catch (err) {
    console.error("completeOnboarding: decode error", err);
    redirect("/sign-in");
  }

  if (!sub) {
    console.error("completeOnboarding: no sub in token");
    redirect("/sign-in");
  }

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, sub!))
    .limit(1);

  if (!userRow) {
    console.error("completeOnboarding: user not found for sub", sub);
    redirect("/sign-in");
  }

  await db
    .update(users)
    .set({
      onboardingStep: "DONE", // 🔥 your enum value
      updatedAt: new Date(),
    })
    .where(eq(users.id, userRow.id));

  redirect("/dashboard");
}

export default async function OnboardingCompletePage() {
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
              We&apos;ve received your onboarding information. If you booked a review
              call, it&apos;s scheduled. Your tax pro will review everything and reach
              out if anything else is needed.
            </p>
          </header>

          {/* Success banner */}
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
              view messages from your tax pro, and track the status of your return.
            </p>

            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
              <li>Upload any additional W-2s, 1099s, or supporting documents.</li>
              <li>Check for messages or requests from your tax pro.</li>
              <li>See when your return is ready to review and e-sign.</li>
            </ul>
          </section>

          <form action={completeOnboarding} className="mt-6">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-extrabold text-white shadow-sm ring-1 ring-black/5 hover:opacity-95"
              style={{
                background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent})`,
              }}
            >
              Go to my dashboard
            </button>
          </form>

          <p className="mt-3 text-[11px] text-center text-slate-500">
            You can come back and update your information anytime by signing in to your account.
          </p>
        </div>

        {/* small footer note */}
        <p className="mt-4 text-center text-[11px] text-white/70">
          Need help? Contact support and we’ll walk you through it.
        </p>
      </div>
    </main>
  );
}