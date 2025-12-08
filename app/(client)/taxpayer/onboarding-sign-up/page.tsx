// app/taxpayer/onboarding-sign-up/page.tsx
import { db } from "@/drizzle/db";
import { invites } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import OnboardingSignUpForm from "../_components/OnboardingSignUpForm";

type InviteRow = typeof invites.$inferSelect;

// ✅ In Next 16, searchParams is a Promise on server components
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TaxpayerOnboardingSignUpPage({
  searchParams,
}: PageProps) {
  // ✅ Await the promise
  const sp = await searchParams;

  // ✅ Normalize token whether it's string or string[]
  const rawToken = sp.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  console.log("Onboarding page searchParams (resolved):", sp);
  console.log("Normalized token:", token);

  if (!token) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow">
          <h1 className="text-lg font-semibold text-gray-900">
            Invalid invite link
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            This onboarding link is missing a token. Please use the link sent to
            your email, or contact support.
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

  if (
    !invite ||
    invite.type !== "taxpayer" ||
    invite.status !== "pending" ||
    (invite.expiresAt && invite.expiresAt < now)
  ) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow">
          <h1 className="text-lg font-semibold text-gray-900">
            This link is no longer valid
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Your onboarding invite may be expired, already used, or invalid.
            Please reach out to SW Tax Service if you need a new link.
          </p>
        </div>
      </main>
    );
  }

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
            You’ve been approved from the waitlist. Finish creating your
            account to start your tax onboarding.
          </p>
          {plan && (
            <div className="mt-3 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              Plan: {plan}
            </div>
          )}
        </div>

        <OnboardingSignUpForm
          email={invite.email}
          token={invite.token}
          plan={plan}
        />
      </div>
    </main>
  );
}
