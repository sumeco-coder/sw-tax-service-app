import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/drizzle/db";
import { foreignAccountsDigitalAssets } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Accept ANY object payload (no separate schema file needed)
const PayloadSchema = z.object({}).passthrough();

export async function GET() {
  const { user } = await requireClientUser();

  const [row] = await db
    .select({ data: foreignAccountsDigitalAssets.data })
    .from(foreignAccountsDigitalAssets)
    .where(eq(foreignAccountsDigitalAssets.userId, user.id))
    .limit(1);

  return NextResponse.json({ ok: true, data: row?.data ?? null });
}

export async function POST(req: NextRequest) {
  const { user } = await requireClientUser();

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload (must be an object)" },
      { status: 400 }
    );
  }

  await db
    .insert(foreignAccountsDigitalAssets)
    .values({
      userId: user.id,
      data: parsed.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: foreignAccountsDigitalAssets.userId,
      set: {
        data: parsed.data,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
