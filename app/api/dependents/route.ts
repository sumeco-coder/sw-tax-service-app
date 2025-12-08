// app/api/dependents/route.ts

import { NextResponse } from "next/server";
import { db, users, dependents } from "@/drizzle/db";
import { eq } from "drizzle-orm";
import { configureAmplify } from "@/lib/amplifyClient";
import { getCurrentUser } from "aws-amplify/auth";
import { randomUUID } from "crypto";

configureAmplify();

async function getUserRow() {
  const { userId } = await getCurrentUser();
  const [u] = await db.select().from(users).where(eq(users.cognitoSub, userId)).limit(1);
  return u ?? null;
}

// GET /api/dependents -> list
export async function GET() {
  const u = await getUserRow();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(dependents).where(eq(dependents.userId, u.id));
  // serialize date -> yyyy-mm-dd
  const data = rows.map((r) => ({
  ...r,
  dob: r.dob ? String(r.dob).slice(0, 10) : "",
}));

  return NextResponse.json(data);
}

// POST /api/dependents -> create
export async function POST(req: Request) {
  const u = await getUserRow();
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json();

  const firstName = String(b.firstName || "").trim().slice(0,80);
  const lastName  = String(b.lastName  || "").trim().slice(0,80);
  const dobStr    = String(b.dob || "").trim(); // YYYY-MM-DD
  const relationship = String(b.relationship || "").trim().slice(0,40);
  const ssnLast4 = String(b.ssnLast4 || "").replace(/\D/g,"").slice(0,4);
  const monthsInHome = Math.max(0, Math.min(12, Number(b.monthsInHome ?? 12)));
  const isStudent  = !!b.isStudent;
  const isDisabled = !!b.isDisabled;

  if (!firstName || !lastName || !dobStr || !relationship || ssnLast4.length !== 4)
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });

  const row = {
    id: randomUUID(),
    userId: u.id,
    firstName,
    lastName,
    dob: dobStr, // Postgres date accepts Date; driver stores date only
    relationship,
    ssnLast4,
    monthsInHome,
    isStudent,
    isDisabled,
  };

  await db.insert(dependents).values(row);
  // return created record with serialized dob
  return NextResponse.json({ ...row, dob: dobStr }, { status: 201 });
}
