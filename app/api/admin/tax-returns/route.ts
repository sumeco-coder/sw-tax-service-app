import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { taxReturns } from "@/drizzle/schema";
import { z } from "zod";
import { getServerRole } from "@/lib/auth/roleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function requireAdmin() {
  const me = await getServerRole();
  const role = String(me?.role ?? "").toLowerCase();
  const ok =
    me?.sub &&
    (role === "admin" || role === "superadmin" || role === "lms_admin" || role === "lms_preparer");
  return ok ? me : null;
}

const BodySchema = z.object({
  userId: z.string().min(1),
  taxYear: z.coerce.number().int(),
  refundAmount: z.union([z.string(), z.number(), z.null()]).optional(),
  refundEta: z.union([z.string(), z.null()]).optional(), // "YYYY-MM-DD" or null
  status: z
    .enum(["PENDING", "DRAFT", "IN_REVIEW", "FILED", "ACCEPTED", "REJECTED", "AMENDED"])
    .optional(),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return noStoreJson({ error: "Forbidden" }, 403);

  const raw = await req.json();
  const parsed = BodySchema.safeParse(raw);

  if (!parsed.success) {
    return noStoreJson({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const { userId, taxYear, refundAmount, refundEta, status } = parsed.data;

  const refundAmountStr =
    refundAmount === null || refundAmount === undefined || refundAmount === ""
      ? null
      : String(refundAmount);

  const refundEtaStr =
    refundEta === null || refundEta === undefined || refundEta === ""
      ? null
      : String(refundEta).slice(0, 10);

  await db
    .insert(taxReturns)
    .values({
      userId,
      taxYear,
      refundAmount: refundAmountStr,
      refundEta: refundEtaStr,
      ...(status ? { status } : {}),
    })
    .onConflictDoUpdate({
      target: [taxReturns.userId, taxReturns.taxYear],
      set: {
        refundAmount: refundAmountStr,
        refundEta: refundEtaStr,
        ...(status ? { status } : {}),
      },
    });

  return noStoreJson({ ok: true }, 200);
}
