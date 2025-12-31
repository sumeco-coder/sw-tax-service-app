// app/api/income-documentation/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/drizzle/db";
import { incomeDocumentation } from "@/drizzle/schema";
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
    .select({ data: incomeDocumentation.data })
    .from(incomeDocumentation)
    .where(eq(incomeDocumentation.userId, user.id))
    .limit(1);

  return NextResponse.json({ ok: true, data: row?.data ?? null });
}

export async function POST(req: NextRequest) {
  const { user } = await requireClientUser();

  const body = await req.json().catch(() => null);

  // since your DB column is NOT NULL, require a JSON object
  if (!isPlainObject(body)) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload (expected an object)" },
      { status: 400 }
    );
  }

  await db
    .insert(incomeDocumentation)
    .values({
      userId: user.id,
      data: body,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: incomeDocumentation.userId,
      set: {
        data: body,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
