// app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "aws-amplify/auth";
import { db } from "@/drizzle/db";

import { users, userSettings } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const cu = await getCurrentUser();
  const u = await db.query.users.findFirst({ where: eq(users.cognitoSub, cu.userId) });
  const s = await db.query.userSettings.findFirst({ where: eq(userSettings.userId, u!.id) });
  return NextResponse.json(s);
}

export async function PATCH(req: NextRequest) {
  const cu = await getCurrentUser();
  const body = await req.json();
  const u = await db.query.users.findFirst({ where: eq(users.cognitoSub, cu.userId) });
  await db.update(userSettings).set(
    // Option A: set individual columns:
    // { theme: body.theme, emailProduct: body.emailProduct, ... }
    // Option B (JSON): { prefs: sql`jsonb_strip_nulls(${JSON.stringify(body)})` }  ← if merging server-side
    body
  ).where(eq(userSettings.userId, u!.id));
  return NextResponse.json({ ok: true });
}
