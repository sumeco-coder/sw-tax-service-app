// app/api/me/route.ts
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Prefer server-auth (cookies) when available
    const server = await getServerRole();
    const subFromCookie = server?.sub ? String(server.sub) : "";
    const emailFromCookie = server?.email ? normalizeEmail(server.email) : "";

    const cognitoSub = (subFromCookie || String(body?.cognitoSub ?? "")).trim();
    const email = normalizeEmail(emailFromCookie || body?.email);

    if (!cognitoSub || !email) {
      return NextResponse.json(
        { error: "Missing cognitoSub or email" },
        { status: 400 }
      );
    }

    // If caller provided a different sub than cookie, block (prevents spoofing when cookies exist)
    const bodySub = String(body?.cognitoSub ?? "").trim();
    if (subFromCookie && bodySub && bodySub !== subFromCookie) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Always ensure row exists (create minimal shell if missing)
    await db
      .insert(users)
      .values({
        cognitoSub,
        email,
        onboardingStep: "PROFILE" as any,
      })
      .onConflictDoUpdate({
        target: users.cognitoSub,
        set: {
          email,
          updatedAt: new Date(),
        },
      });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.cognitoSub, cognitoSub))
      .limit(1);

    return NextResponse.json({ user }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/me error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
