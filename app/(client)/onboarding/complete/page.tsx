// app/(client)/onboarding/complete/page.tsx
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <header className="mb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Taxpayer onboarding
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            You&apos;re all set for now
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            We&apos;ve received your onboarding information and your review call
            is scheduled. Your tax pro will review everything and reach out if
            anything else is needed.
          </p>
        </header>

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

        <form action={completeOnboarding} className="mt-6">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Go to my dashboard
          </button>
        </form>

        <p className="mt-3 text-[11px] text-center text-slate-500">
          You can come back and update your information anytime by signing in to
          your account.
        </p>
      </div>
    </main>
  );
}
