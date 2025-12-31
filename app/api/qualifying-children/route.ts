// app/api/qualifying-children/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/drizzle/db";
import { qualifyingChildren } from "@/drizzle/schema"; // <- make sure this export exists
import { eq } from "drizzle-orm";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPlainObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export async function GET() {
  const { user } = await requireClientUser();

  const [row] = await db
    .select({ data: qualifyingChildren.data })
    .from(qualifyingChildren)
    .where(eq(qualifyingChildren.userId, user.id))
    .limit(1);

  return NextResponse.json({ ok: true, data: row?.data ?? null });
}

export async function POST(req: NextRequest) {
  const { user } = await requireClientUser();

  const body = await req.json().catch(() => null);

  // minimal protection: must be object + have children array
  if (!isPlainObject(body) || !Array.isArray(body.children)) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload (expected { children: [...] })" },
      { status: 400 }
    );
  }

  await db
    .insert(qualifyingChildren)
    .values({
      userId: user.id,
      data: body,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: qualifyingChildren.userId,
      set: {
        data: body,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
