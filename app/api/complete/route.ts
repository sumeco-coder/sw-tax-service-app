import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

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

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const rawNext = typeof body?.next === "string" ? body.next : "";
  const intended = normalizePostOnboardingTarget(
    safeInternalPath(rawNext, "/dashboard")
  );

  const cookieStore = await cookies();
  const idToken = cookieStore.get("idToken")?.value;

  if (!idToken) {
    return NextResponse.json(
      { ok: false, redirectTo: `/sign-in?next=${encodeURIComponent(intended)}` },
      { status: 401 }
    );
  }

  let sub: string | undefined;
  try {
    sub = (decodeJwt(idToken) as any)?.sub as string | undefined;
  } catch {
    return NextResponse.json(
      { ok: false, redirectTo: `/sign-in?next=${encodeURIComponent(intended)}` },
      { status: 401 }
    );
  }

  if (!sub) {
    return NextResponse.json(
      { ok: false, redirectTo: `/sign-in?next=${encodeURIComponent(intended)}` },
      { status: 401 }
    );
  }

  const updated = await db
    .update(users)
    .set({
      onboardingStep: "DONE",
      updatedAt: new Date(),
    })
    .where(eq(users.cognitoSub, sub))
    .returning({ id: users.id });

  if (updated.length === 0) {
    return NextResponse.json(
      { ok: false, redirectTo: `/sign-in?next=${encodeURIComponent(intended)}` },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true, redirectTo: intended });
}
