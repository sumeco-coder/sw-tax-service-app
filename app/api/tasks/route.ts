// app/api/tasks/route.ts
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { tasks } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { getServerUser } from "@/lib/auth/getServerUser";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const me = await getServerUser();
  if (!me?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());

  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, me.userId), eq(tasks.taxYear, year)));

  return NextResponse.json(rows);
}
