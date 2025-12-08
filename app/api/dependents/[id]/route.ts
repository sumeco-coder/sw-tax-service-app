// app/api/dependents/[id]/route.ts
import { NextResponse } from "next/server";
import { db, users, dependents } from "@/drizzle/db";
import { eq, and } from "drizzle-orm";
import { configureAmplify } from "@/lib/amplifyClient";
import { getCurrentUser } from "aws-amplify/auth";

configureAmplify();

async function getUser() {
  const { userId } = await getCurrentUser();
  const [u] = await db.select().from(users).where(eq(users.cognitoSub, userId)).limit(1);
  return u ?? null;
}

// PATCH /api/dependents/[id]
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json();
  const set: any = {};
  if (typeof b.firstName === "string") set.firstName = b.firstName.trim().slice(0, 80);
  if (typeof b.lastName === "string") set.lastName = b.lastName.trim().slice(0, 80);
  if (typeof b.dob === "string") set.dob = b.dob.trim().slice(0, 10);
  if (typeof b.relationship === "string") set.relationship = b.relationship.trim().slice(0, 40);
  if (typeof b.ssnLast4 === "string") {
    const s = b.ssnLast4.replace(/\D/g, "").slice(0, 4);
    if (s.length !== 4) return NextResponse.json({ error: "Invalid ssnLast4" }, { status: 400 });
    set.ssnLast4 = s;
  }
  if (b.monthsLived != null) {
    const m = Math.max(0, Math.min(12, Number(b.monthsLived)));
    if (Number.isFinite(m)) set.monthsLived = m;
  }
  if (b.isStudent != null) set.isStudent = Boolean(b.isStudent);
  if (b.isDisabled != null) set.isDisabled = Boolean(b.isDisabled);
  set.updatedAt = new Date();

  if (Object.keys(set).length <= 1) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  await db
    .update(dependents)
    .set(set)
    .where(and(eq(dependents.id, params.id), eq(dependents.userId, u.id)));

  return NextResponse.json({ success: true });
}

// DELETE /api/dependents/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db
    .delete(dependents)
    .where(and(eq(dependents.id, params.id), eq(dependents.userId, u.id)));

  return NextResponse.json({ success: true });
}
