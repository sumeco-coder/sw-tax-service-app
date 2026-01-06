// app/api/stripe/confirm/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/drizzle/db";
import { taxCalculatorLeads, users } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) return NextResponse.json({ ok: false }, { status: 400 });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const paid = session.payment_status === "paid";
  const emailLower = String(
    session?.metadata?.emailLower ?? session?.customer_email ?? ""
  )
    .trim()
    .toLowerCase();

  if (paid && emailLower) {
    await db
      .insert(taxCalculatorLeads)
      .values({
        email: emailLower,
        emailLower,
        taxPlanUnlocked: true,
        taxPlanUnlockedAt: new Date(),
        stripeCustomerId: String(session.customer ?? "") || null,
        stripeCheckoutSessionId: String(session.id ?? "") || null,
        source: "tax-calculator",
      })
      .onConflictDoUpdate({
        target: taxCalculatorLeads.emailLower,
        set: {
          taxPlanUnlocked: true,
          taxPlanUnlockedAt: new Date(),
          stripeCustomerId: String(session.customer ?? "") || null,
          stripeCheckoutSessionId: String(session.id ?? "") || null,
          updatedAt: new Date(),
        },
      });

    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${emailLower}`)
      .limit(1);

    if (found[0]) {
      await db
        .update(users)
        .set({ hasPaidForPlan: true })
        .where(eq(users.id, found[0].id));
    }
  }

  return NextResponse.json({ ok: true, paid, emailLower });
}
