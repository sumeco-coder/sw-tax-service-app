// app/api/tasks/[tasksId]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { tasks } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { getServerUser } from "@/lib/auth/getServerUser";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const);
type AllowedStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

function pickStatus(v: unknown): AllowedStatus | null {
  const s = String(v ?? "").toUpperCase().trim();
  return (ALLOWED_STATUS as Set<string>).has(s) ? (s as AllowedStatus) : null;
}

// GET one task (optional but useful)
export async function GET(
  _req: Request,
  { params }: { params: { tasksId: string } }
) {
  const me = await getServerUser();
  if (!me?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = String(params.tasksId || "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, me.userId)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

// Update status (client uses this to mark done, etc.)
export async function PUT(
  req: Request,
  { params }: { params: { tasksId: string } }
) {
  const me = await getServerUser();
  if (!me?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = String(params.tasksId || "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const status = pickStatus(body?.status);

  if (!status) {
    return NextResponse.json(
      { error: "Invalid status. Use OPEN, IN_PROGRESS, DONE, or CANCELLED." },
      { status: 400 }
    );
  }

  const updated = await db
    .update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, me.userId)))
    .returning();

  if (!updated.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated[0]);
}

// Delete (optional)
export async function DELETE(
  _req: Request,
  { params }: { params: { tasksId: string } }
) {
  const me = await getServerUser();
  if (!me?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = String(params.tasksId || "").trim();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, me.userId)))
    .returning();

  if (!deleted.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
