// app/(client)/taxpayer/onboarding-sign-up/page.tsx
import { db } from "@/drizzle/db";
import { invites } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import OnboardingSignUpForm from "../_components/OnboardingSignUpForm"
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InviteRow = typeof invites.$inferSelect;

function oneParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function normalizeBaseUrl(raw: unknown) {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  s = s.replace(/\/+$/, "");
  return s;
}

/**
 * ✅ Uses current host (works on localhost + any domain),
 * fallback to envs if host headers aren’t available.
 */
async function getOriginFromRequest() {
  try {
    const h = await headers(); // ✅ Next 15
    const host = (h.get("x-forwarded-host") || h.get("host") || "").trim();
    if (host) {
      const protoRaw = (h.get("x-forwarded-proto") || "").trim();
      const proto = protoRaw || (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // ignore
  }

  const normalizeBaseUrl = (raw: unknown) => {
    let s = String(raw ?? "").trim();
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
    s = s.replace(/\/+$/, "");
    return s;
  };

  return (
    normalizeBaseUrl(process.env.APP_ORIGIN) ||
    normalizeBaseUrl(process.env.SITE_URL) ||
    "http://localhost:3000"
  );
}

interface PageProps {
  searchParams:
    | Promise<{ [key: string]: string | string[] | undefined }>
    | { [key: string]: string | string[] | undefined };
}

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

function Shell({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: string | null;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-4 py-10 bg-gradient-to-br from-[#E72B69]/10 via-white to-[#BA4A26]/10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }}
            />
            SW Tax Service
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: BRAND.charcoal }}>
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>

          {badge ? (
            <div
              className="mt-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }}
            >
              {badge}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
          {children}
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Need help?{" "}
          <a className="font-semibold underline" href="mailto:support@swtaxservice.com">
            support@swtaxservice.com
          </a>
        </p>
      </div>
    </main>
  );
}

export default async function TaxpayerOnboardingSignUpPage({ searchParams }: PageProps) {
  const sp = (await Promise.resolve(searchParams)) as {
    [key: string]: string | string[] | undefined;
  };

  // ✅ accept either token or invite
  const token = (oneParam(sp.token) || oneParam(sp.invite) || "").trim();

  // ✅ FIX: await the async origin helper
  const origin = await getOriginFromRequest();

  // Helpful sign-in URL (keeps invite context + routes back into onboarding)
  const signInUrl = `${origin}/sign-in?invite=${encodeURIComponent(
    token
  )}&next=${encodeURIComponent("/onboarding/profile")}`;

  if (!token) {
    return (
      <Shell
        title="Invalid invite link"
        subtitle="This onboarding link is missing a token. Please use the link sent to your email, or contact support."
      >
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-sm text-slate-700">
            If you believe this is an error, request a new invite.
          </p>
        </div>
      </Shell>
    );
  }

  let invite: InviteRow | undefined;

  try {
    const rows = await db.select().from(invites).where(eq(invites.token, token)).limit(1);
    invite = rows[0];
  } catch (err) {
    console.error("Error loading invite:", err);
  }

  const now = new Date();
  const expired = !!invite?.expiresAt && invite.expiresAt < now;

  if (!invite || invite.type !== "taxpayer" || expired) {
    return (
      <Shell
        title="This link is no longer valid"
        subtitle="Your onboarding invite may be expired or invalid. Please reach out to SW Tax Service if you need a new link."
      >
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-sm text-slate-700">
            Ask support for a new onboarding invite.
          </p>
        </div>
      </Shell>
    );
  }

  if (invite.status !== "pending") {
    return (
      <Shell
        title="This link was already used"
        subtitle="If you already created your account, sign in to continue."
      >
        <a
          href={signInUrl}
          className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }}
        >
          Sign in
        </a>

        <p className="mt-3 text-center text-xs text-slate-500">
            Sign in to continue your onboarding.
        </p>
      </Shell>
    );
  }

  const meta = invite.meta as any;
  const plan = typeof meta?.plan === "string" ? meta.plan : undefined;
  const source = typeof meta?.source === "string" ? meta.source : undefined;

  const subtitle =
    source === "direct"
      ? "You’ve been invited to create your account. Finish signup to begin onboarding."
      : "You’ve been approved. Finish creating your account to start your tax onboarding.";

  return (
    <Shell
      title="Create your SW Tax Service account"
      subtitle={subtitle}
      badge={plan ? `Plan: ${plan}` : null}
    >
      <OnboardingSignUpForm email={invite.email} token={invite.token} plan={plan} />

      <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
        <p className="text-xs text-slate-600">
          By continuing, you’ll create your portal account and start your onboarding steps.
        </p>
      </div>
    </Shell>
  );
}
