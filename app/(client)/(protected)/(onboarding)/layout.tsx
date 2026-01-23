// app/(client)/(protected)/(onboarding)/layout.tsx
import React from "react";
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
  if (raw.includes("://")) return fallback;
  return raw;
}

function cleanLower(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

// Best-effort way to know which onboarding page is being requested.
// (We mainly need this to avoid redirecting /onboarding/complete to itself.)
async function getCurrentPathname(): Promise<string> {
  const h = await headers();

  // try a few common proxy/CDN headers (may be empty depending on platform)
  const fromOriginalUrl = h.get("x-original-url") || h.get("x-rewrite-url") || "";
  if (fromOriginalUrl.startsWith("/")) return fromOriginalUrl.split("?")[0] || "";

  // Next.js sometimes includes this
  const nextUrl = h.get("next-url");
  if (nextUrl?.startsWith("/")) return nextUrl.split("?")[0] || "";

  // fallback: if none available, return empty string (we'll avoid risky redirects)
  return "";
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

  // ✅ Get ?next= best-effort. (Referer may be missing; default to dashboard.)
  const h = await headers();
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

  // ✅ If missing, create the DB user row (fresh Cognito account)
  if (!u && role === "taxpayer") {
    const c = await cookies();
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
      // @ts-ignore
      .onConflictDoNothing({ target: users.cognitoSub });

    [u] = await db
      .select({ onboardingStep: users.onboardingStep })
      .from(users)
      .where(eq(users.cognitoSub, sub))
      .limit(1);
  }

  const step = String(u?.onboardingStep ?? "");
  const pathname = await getCurrentPathname();

  /**
   * ✅ IMPORTANT REDIRECT RULES (NO LOOPS)
   *
   * - DO NOT redirect to /onboarding/complete from this layout.
   *   This layout wraps /onboarding/complete, so doing so causes a self-redirect loop (307 -> same URL).
   *
   * - If you want "finished" users out of onboarding, send them to /dashboard (or next),
   *   but only if we are not already on /onboarding/complete (or if pathname is unknown).
   */

  // If user is truly finished, keep them out of onboarding pages *except* complete.
  if (step === "DONE") {
    // If we're on the complete page, let it render.
    if (pathname && pathname.startsWith("/onboarding/complete")) {
      return <>{children}</>;
    }
    // Otherwise push to intended next destination
    redirect(next);
  }

  // If step is SUBMITTED, do NOT redirect here (prevents loop).
  // Let summary/actions redirect to complete, and let complete page render.
  if (step === "SUBMITTED") {
    return <>{children}</>;
  }

  return <>{children}</>;
}
