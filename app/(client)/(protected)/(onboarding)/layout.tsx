// app/(client)/(protected)/(onboarding)/layout.tsx
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { decodeJwt } from "jose";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeInternalPath(input: string | null, fallback: string) {
  const raw = (input ?? "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  return raw;
}

function cleanLower(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getServerRole();
  if (!me?.sub) redirect("/sign-in");

  const role = String(me.role ?? "").toLowerCase();
  const allowed = role === "taxpayer" || role === "admin" || role === "superadmin";
  if (!allowed) redirect("/not-authorized");

  const sub = String(me.sub);

  // ✅ Get ?next= from current request (works well enough behind CDN)
  const h = await Promise.resolve(headers());
  const urlStr = h.get("x-url") || h.get("referer") || "";
  const nextFromUrl = (() => {
    try {
      const u = new URL(urlStr);
      return u.searchParams.get("next");
    } catch {
      return null;
    }
  })();

  const next = safeInternalPath(nextFromUrl, "/dashboard");

  // ✅ Load DB user row by cognitoSub
  let [u] = await db
    .select({ onboardingStep: users.onboardingStep })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  // ✅ Permanent fix: if missing, create the DB user row (fresh Cognito account)
  if (!u && role === "taxpayer") {
    const c = await Promise.resolve(cookies());
    const idToken = c.get("idToken")?.value ?? "";

    let email = "";
    let firstName = "";
    let lastName = "";
    let fullName = "";

    try {
      const payload = idToken ? (decodeJwt(idToken) as Record<string, any>) : null;
      email = cleanLower(payload?.email);
      firstName = String(payload?.given_name ?? "").trim();
      lastName = String(payload?.family_name ?? "").trim();
      fullName = String(payload?.name ?? "").trim();
    } catch {
      // ignore
    }

    // DB requires email; if token missing, force sign-in again
    if (!email) {
      redirect("/sign-in?reason=reauth");
    }

    await db
      .insert(users)
      .values({
        cognitoSub: sub,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        name: fullName || `${firstName} ${lastName}`.trim() || null,
        onboardingStep: "PROFILE",
      })
      // drizzle conflict helper (keeps it safe in races)
      // @ts-ignore
      .onConflictDoNothing({ target: users.cognitoSub });

    // reload after insert
    [u] = await db
      .select({ onboardingStep: users.onboardingStep })
      .from(users)
      .where(eq(users.cognitoSub, sub))
      .limit(1);
  }

  const step = String(u?.onboardingStep ?? "");

  // ✅ If finished, push them forward
  if (step === "DONE") redirect(next);
  if (step === "SUBMITTED") redirect("/onboarding/complete"); // optional

  return <>{children}</>;
}
