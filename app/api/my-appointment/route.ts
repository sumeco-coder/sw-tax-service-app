// app/api/my-appointment/route.ts
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { appointments, users } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export async function POST() {
  try {
    const me = await getServerRole();
    const cognitoSub = me?.sub ? String(me.sub) : "";

    if (!cognitoSub) {
      return NextResponse.json({ appointment: null }, { status: 200 });
    }

    const [userRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.cognitoSub, cognitoSub))
      .limit(1);

    if (!userRow) {
      return NextResponse.json({ appointment: null }, { status: 200 });
    }

    const [appt] = await db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        status: appointments.status,
      })
      .from(appointments)
      .where(eq(appointments.userId, userRow.id))
      .orderBy(desc(appointments.scheduledAt))
      .limit(1);

    if (!appt || appt.status !== "scheduled") {
      return NextResponse.json({ appointment: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        appointment: {
          id: appt.id,
          startsAt: appt.scheduledAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { appointment: null, error: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
