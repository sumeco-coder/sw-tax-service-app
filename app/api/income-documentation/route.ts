import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/drizzle/db";
import { incomeDocumentation } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";
import { IncomeDocumentationSchema } from "@/schemas/questionnaire/income-documentation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const parsed = IncomeDocumentationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await db
    .insert(incomeDocumentation)
    .values({
      userId: user.id,
      data: parsed.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: incomeDocumentation.userId,
      set: {
        data: parsed.data,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
