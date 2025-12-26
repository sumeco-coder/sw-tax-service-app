// app/(client)/taxpayer/onboarding-sign-up/page.tsx
import { db } from "@/drizzle/db";
import { invites } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import OnboardingSignUpForm from "../_components/OnboardingSignUpForm";

type InviteRow = typeof invites.$inferSelect;

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TaxpayerOnboardingSignUpPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;

  const rawToken = sp.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  if (!token) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow">
          <h1 className="text-lg font-semibold text-gray-900">Invalid invite link</h1>
          <p className="mt-2 text-sm text-gray-600">
            This onboarding link is missing a token. Please use the link sent to your email,
            or contact support.
          </p>
        </div>
      </main>
    );
  }

  let invite: InviteRow | undefined;

  try {
    const rows = await db
      .select()
      .from(invites)
      .where(eq(invites.token, token))
      .limit(1);

    invite = rows[0];
  } catch (err) {
    console.error("Error loading invite:", err);
  }

  const now = new Date();
  const expired = !!invite?.expiresAt && invite.expiresAt < now;

  // ✅ Case 1: invalid / wrong type / expired / not found
  if (!invite || invite.type !== "taxpayer" || expired) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow">
          <h1 className="text-lg font-semibold text-gray-900">This link is no longer valid</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your onboarding invite may be expired or invalid. Please reach out to SW Tax Service
            if you need a new link.
          </p>
        </div>
      </main>
    );
  }

  // ✅ Case 2: already used (accepted / cancelled / etc.)
  if (invite.status !== "pending") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow">
          <h1 className="text-lg font-semibold text-gray-900">This link was already used</h1>
          <p className="mt-2 text-sm text-gray-600">
            If you already created your account, sign in to continue onboarding.
          </p>

          <a
            href="/sign-in"
            className="mt-4 inline-flex rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white"
          >
            Sign in
          </a>
        </div>
      </main>
    );
  }

  // ✅ Case 3: pending + valid → show signup form
  const plan =
    (invite.meta as any)?.plan && typeof (invite.meta as any).plan === "string"
      ? (invite.meta as any).plan
      : undefined;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Create your SW Tax Service account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            You’ve been approved from the waitlist. Finish creating your account to start your tax onboarding.
          </p>

          {plan && (
            <div className="mt-3 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              Plan: {plan}
            </div>
          )}
        </div>

        <OnboardingSignUpForm email={invite.email} token={invite.token} plan={plan} />
      </div>
    </main>
  );
}
