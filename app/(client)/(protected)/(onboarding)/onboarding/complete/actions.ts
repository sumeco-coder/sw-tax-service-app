// app/(client)/(protected)/(onboarding)/onboarding/complete/actions.ts
"use server";

import { cookies, headers } from "next/headers";
import { decodeJwt } from "jose";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

function safeInternalPath(input: string | null | undefined, fallback: string) {
  const raw = (input ?? "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("://")) return fallback;
  return raw;
}

function normalizePostOnboardingTarget(path: string) {
  // Never redirect back into onboarding after completion
  if (path.startsWith("/onboarding")) return "/dashboard";
  return path;
}

// ✅ In your Next version, headers() is async (Promise<ReadonlyHeaders>)
async function getCookieDomainForProd(): Promise<string | undefined> {
  const h = await headers();
  const host = h.get("host") ?? "";

  const isOnPrimaryDomain =
    host === "swtaxservice.com" || host.endsWith(".swtaxservice.com");

  // Only set a cross-subdomain cookie when actually on your real domain
  return isOnPrimaryDomain ? ".swtaxservice.com" : undefined;
}

export async function completeOnboarding(formData: FormData) {
  const rawNext = String(formData.get("next") ?? "");
  const intended = normalizePostOnboardingTarget(
    safeInternalPath(rawNext, "/dashboard")
  );

  const cookieStore = await cookies();
  const idToken = cookieStore.get("idToken")?.value;

  if (!idToken) {
    redirect(`/sign-in?next=${encodeURIComponent(intended)}`);
  }

  let sub: string | undefined;
  try {
    sub = (decodeJwt(idToken) as any)?.sub as string | undefined;
  } catch {
    redirect(`/sign-in?next=${encodeURIComponent(intended)}`);
  }

  if (!sub) {
    redirect(`/sign-in?next=${encodeURIComponent(intended)}`);
  }

  const updated = await db
    .update(users)
    .set({ onboardingStep: "DONE", updatedAt: new Date() })
    .where(eq(users.cognitoSub, sub))
    .returning({ id: users.id });

  if (updated.length === 0) {
    redirect(`/sign-in?next=${encodeURIComponent(intended)}`);
  }

  // ✅ Cookie stops middleware redirect loops immediately (no JWT refresh needed)
  const isProd = process.env.NODE_ENV === "production";
  const domain = isProd ? await getCookieDomainForProd() : undefined;

  cookieStore.set("onboardingComplete", "true", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    domain,
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  redirect(intended);
}
