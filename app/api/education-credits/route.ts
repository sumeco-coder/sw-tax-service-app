import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/drizzle/db";
import { educationCredits } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


// minimal validation (accepts full form object)
const BodySchema = z.object({}).passthrough();

async function getUserOr401() {
  try {
    return await requireClientUser();
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await getUserOr401();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user } = auth;

  const [row] = await db
    .select({ payload: educationCredits.payload })
    .from(educationCredits)
    .where(eq(educationCredits.userId, user.id))
    .limit(1);

  return NextResponse.json({ ok: true, values: row?.payload ?? null });
}

export async function POST(req: Request) {
  const auth = await getUserOr401();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user } = auth;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await db
    .insert(educationCredits)
    .values({
      userId: user.id,
      payload: parsed.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [educationCredits.userId],
      set: { payload: parsed.data, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
