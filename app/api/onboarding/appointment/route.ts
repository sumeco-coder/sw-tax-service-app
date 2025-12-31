// app/api/onboarding/appointment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { appointments, users } from "@/drizzle/schema";
import { and, asc, eq, gte } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

async function getOrCreateUserBySub(cognitoSub: string, email?: string) {
  const [existing] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (existing) {
    if (email && email !== existing.email) {
      const [updated] = await db
        .update(users)
        .set({ email, updatedAt: new Date() })
        .where(eq(users.id, existing.id))
        .returning({ id: users.id, email: users.email });
      return updated ?? existing;
    }
    return existing;
  }

  if (!email) throw new Error("Missing email. Please sign in again.");

  const [created] = await db
    .insert(users)
    .values({ cognitoSub, email, updatedAt: new Date() } as any)
    .returning({ id: users.id, email: users.email });

  return created;
}

export async function GET(req: NextRequest) {
  try {
    const me = await getServerRole();
    const subFromCookie = me?.sub ? String(me.sub) : "";
    const emailFromCookie = me?.email ? normalizeEmail(me.email) : "";

    if (!subFromCookie) {
      return NextResponse.json({ appointment: null }, { status: 200 });
    }

    // ✅ Normal users: only their own data
    let targetSub = subFromCookie;

    // ✅ Optional admin override: allow querying by ?sub=
    const url = new URL(req.url);
    const subParam = String(url.searchParams.get("sub") ?? "").trim();
    if (me?.role === "admin" && subParam) {
      targetSub = subParam;
    }

    const u = await getOrCreateUserBySub(targetSub, emailFromCookie);

    // ✅ Next upcoming scheduled appointment
    const now = new Date();

    const [appt] = await db
      .select({
        id: appointments.id,
        startsAt: appointments.scheduledAt,
        status: appointments.status,
        durationMinutes: appointments.durationMinutes,
        notes: appointments.notes,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, u.id),
          eq(appointments.status, "scheduled"),
          gte(appointments.scheduledAt, now)
        )
      )
      .orderBy(asc(appointments.scheduledAt))
      .limit(1);

    if (!appt) {
      return NextResponse.json({ appointment: null }, { status: 200 });
    }

    const dt = appt.startsAt instanceof Date ? appt.startsAt : new Date(appt.startsAt as any);

    return NextResponse.json(
      {
        appointment: {
          ...appt,
          startsAt: Number.isNaN(dt.getTime()) ? null : dt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("GET /api/onboarding/appointment error:", e);
    return NextResponse.json(
      { appointment: null, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
