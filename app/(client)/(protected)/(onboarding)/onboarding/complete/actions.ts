"use server";

import { cookies } from "next/headers";
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
  if (path.startsWith("/onboarding")) return "/dashboard";
  return path;
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
    sub = (decodeJwt(idToken!) as any)?.sub as string | undefined;
  } catch {
    redirect(`/sign-in?next=${encodeURIComponent(intended)}`);
  }

  if (!sub) {
    redirect(`/sign-in?next=${encodeURIComponent(intended)}`);
  }

  // ✅ Clean: update by cognitoSub directly (no SELECT needed)
  const updated = await db
    .update(users)
    .set({
      onboardingStep: "DONE",
      updatedAt: new Date(),
    })
    .where(eq(users.cognitoSub, sub))
    .returning({ id: users.id });

  if (updated.length === 0) {
    redirect(`/sign-in?next=${encodeURIComponent(intended)}`);
  }

  redirect(intended);
}
