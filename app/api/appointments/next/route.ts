import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { db } from "@/drizzle/db";
import { appointments } from "@/drizzle/schema";
import { and, asc, eq, gte, lt } from "drizzle-orm";

export const runtime = "nodejs";

function getUserId(req: NextRequest) {
  const token =
    req.cookies.get("idToken")?.value ||
    req.cookies.get("accessToken")?.value;

  if (!token) return null;

  const payload = decodeJwt(token);
  return typeof payload.sub === "string" ? payload.sub : null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year"); // optional

    const now = new Date();

    let where = and(
      eq(appointments.userId, userId),
      eq(appointments.status, "scheduled"),
      gte(appointments.scheduledAt, now)
    )!;

    if (yearParam) {
      const year = Number(yearParam);
      if (!Number.isInteger(year)) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
      }

      const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

      where =
        and(where, gte(appointments.scheduledAt, start), lt(appointments.scheduledAt, end)) ??
        where;
    }

    const rows = await db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
      })
      .from(appointments)
      .where(where)
      .orderBy(asc(appointments.scheduledAt))
      .limit(1);

    return NextResponse.json(rows[0] ?? null);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch next appointment" },
      { status: 500 }
    );
  }
}
