import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/drizzle/db";
import { headOfHouseholdDocs } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal server validation: require maritalStatus, allow the rest (passthrough)
const MARITAL = [
  "never_married",
  "spouse_deceased",
  "divorced_or_separated",
  "separation_agreement",
  "married_lived_apart_last_6_months",
] as const;

const BodySchema = z
  .object({
    maritalStatus: z.enum(MARITAL),
  })
  .passthrough();

async function getUserOr401() {
  try {
    return await requireClientUser(); // your existing auth helper
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await getUserOr401();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user } = auth;

  const [row] = await db
    .select({ payload: headOfHouseholdDocs.payload })
    .from(headOfHouseholdDocs)
    .where(eq(headOfHouseholdDocs.userId, user.id))
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
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  await db
    .insert(headOfHouseholdDocs)
    .values({
      userId: user.id,
      payload: parsed.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [headOfHouseholdDocs.userId],
      set: {
        payload: parsed.data,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
