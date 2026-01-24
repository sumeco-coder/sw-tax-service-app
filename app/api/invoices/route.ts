// app/api/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { invoices, invoicePayments } from "@/drizzle/schema";
import { and, desc, eq, gte, lt, inArray } from "drizzle-orm";
import { getUserIdFromCookies } from "@/lib/auth/getUserIdFromCookies";

export const runtime = "nodejs";

type PaymentRow = typeof invoicePayments.$inferSelect;

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const includePayments = searchParams.get("includePayments") === "true";

    let where = eq(invoices.userId, userId);

    // Filter by invoice issued year (calendar year)
    if (yearParam) {
      const year = Number(yearParam);
      if (!Number.isInteger(year)) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
      }

      const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

      where =
        and(where, gte(invoices.issuedAt, start), lt(invoices.issuedAt, end)) ??
        where;
    }

    // No payments included
    if (!includePayments) {
      const rows = await db
        .select()
        .from(invoices)
        .where(where)
        .orderBy(desc(invoices.issuedAt));

      return NextResponse.json(
        rows.map((inv) => ({
          ...inv,
          amount: String(inv.amount),
        }))
      );
    }

    // Include payments
    const invRows = await db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.issuedAt));

    const invIds = invRows.map((i) => i.id);

    const payRows: PaymentRow[] =
      invIds.length === 0
        ? []
        : await db
            .select()
            .from(invoicePayments)
            .where(
              and(
                eq(invoicePayments.userId, userId),
                inArray(invoicePayments.invoiceId, invIds)
              )!
            )
            .orderBy(desc(invoicePayments.createdAt));

    const paymentsByInvoice = new Map<string, PaymentRow[]>();

    for (const p of payRows) {
      const list = paymentsByInvoice.get(p.invoiceId) ?? [];
      list.push({
        ...p,
        amount: String(p.amount),
      } as PaymentRow);
      paymentsByInvoice.set(p.invoiceId, list);
    }

    return NextResponse.json(
      invRows.map((inv) => ({
        ...inv,
        amount: String(inv.amount),
        payments: paymentsByInvoice.get(inv.id) ?? [],
      }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
