// app/api/estimated-state-tax-payments/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/drizzle/db";
import { estimatedStateTaxPayments } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function digitsAndDot(v: unknown) {
  return String(v ?? "").replace(/[^\d.]/g, "");
}
function isMoney(v: string) {
  if (v === "") return true;
  if (!/^\d+(\.\d{0,2})?$/.test(v)) return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}
function isIsoDateOrEmpty(v: string) {
  return v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v);
}

const moneyField = z
  .string()
  .default("")
  .transform((v) => digitsAndDot(v))
  .refine((v) => isMoney(v), { message: "Enter a valid amount (e.g., 250 or 250.00)" });

const dateField = z.string().default("").refine((v) => isIsoDateOrEmpty(v), { message: "Use a valid date" });

const Schema = z
  .object({
    overpaymentAppliedFromPriorYear: moneyField,

    q1DatePaid: dateField,
    q1AmountPaid: moneyField,

    q2DatePaid: dateField,
    q2AmountPaid: moneyField,

    q3DatePaid: dateField,
    q3AmountPaid: moneyField,

    q4DatePaid: dateField,
    q4AmountPaid: moneyField,
  })
  .superRefine((d, ctx) => {
    const pairs: Array<[keyof typeof d, keyof typeof d, string]> = [
      ["q1DatePaid", "q1AmountPaid", "1st Quarter"],
      ["q2DatePaid", "q2AmountPaid", "2nd Quarter"],
      ["q3DatePaid", "q3AmountPaid", "3rd Quarter"],
      ["q4DatePaid", "q4AmountPaid", "4th Quarter"],
    ];

    for (const [dateKey, amtKey, label] of pairs) {
      const date = String(d[dateKey] ?? "");
      const amt = String(d[amtKey] ?? "");
      const hasAmt = amt !== "" && Number(amt) > 0;
      const hasDate = date !== "";

      if (hasAmt && !hasDate) {
        ctx.addIssue({ code: "custom", path: [dateKey], message: `${label}: date paid is required when amount is entered` });
      }
      if (hasDate && !hasAmt) {
        ctx.addIssue({ code: "custom", path: [amtKey], message: `${label}: amount paid is required when date is entered` });
      }
    }
  });

export async function GET() {
  const { user } = await requireClientUser();

  const [row] = await db
    .select({ data: estimatedStateTaxPayments.data })
    .from(estimatedStateTaxPayments)
    .where(eq(estimatedStateTaxPayments.userId, user.id))
    .limit(1);

  return NextResponse.json({ ok: true, data: row?.data ?? null });
}

export async function POST(req: NextRequest) {
  const { user } = await requireClientUser();

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  await db
    .insert(estimatedStateTaxPayments)
    .values({
      userId: user.id,
      data: parsed.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: estimatedStateTaxPayments.userId,
      set: {
        data: parsed.data,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
