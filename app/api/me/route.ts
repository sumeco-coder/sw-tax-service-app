// app/api/me/route.ts
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const cognitoSub = (body.cognitoSub as string | undefined)?.trim();
  const email = (body.email as string | undefined)?.trim().toLowerCase();

  if (!cognitoSub || !email) {
    return NextResponse.json(
      { error: "Missing cognitoSub or email" },
      { status: 400 }
    );
  }

  // Try to find existing user row
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (existing) {
    return NextResponse.json({ user: existing });
  }

  // If not found, create a minimal row
  const [created] = await db
    .insert(users)
    .values({
      cognitoSub,
      email,
      // firstName/lastName can be null at first
    })
    .returning();

  return NextResponse.json({ user: created });
}
