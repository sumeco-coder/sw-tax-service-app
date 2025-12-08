// app/api/onboarding/appointment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { appointments, users } from "@/drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sub = url.searchParams.get("sub");

  if (!sub) {
    return NextResponse.json({ appointment: null }, { status: 200 });
  }

  // find user by Cognito sub
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!user) {
    return NextResponse.json({ appointment: null }, { status: 200 });
  }

  // Get latest *scheduled* appointment for this user
  const [appt] = await db
    .select({
      id: appointments.id,
      // map DB column scheduledAt -> API field startsAt (to match your client type)
      startsAt: appointments.scheduledAt,
      status: appointments.status,
      durationMinutes: appointments.durationMinutes,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, user.id),
        eq(appointments.status, "scheduled") // optional but recommended
      )
    )
    .orderBy(desc(appointments.scheduledAt))
    .limit(1);

  return NextResponse.json({ appointment: appt ?? null }, { status: 200 });
}
