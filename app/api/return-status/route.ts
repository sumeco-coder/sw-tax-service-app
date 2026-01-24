import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { db } from "@/drizzle/db";
import { taxReturns } from "@/drizzle/schema";
import { and, eq, desc } from "drizzle-orm";

export const runtime = "nodejs";

function getUserId(req: NextRequest) {
  const token =
    req.cookies.get("idToken")?.value ||
    req.cookies.get("accessToken")?.value;

  if (!token) return null;

  const payload = decodeJwt(token);
  return typeof payload.sub === "string" ? payload.sub : null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");

    if (!yearParam) {
      // if you want to allow "all years", remove this block and select all for user
      return NextResponse.json({ error: "Missing year" }, { status: 400 });
    }

    const year = Number(yearParam);
    if (!Number.isInteger(year)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: taxReturns.id,
        taxYear: taxReturns.taxYear,
        status: taxReturns.status,
        refundAmount: taxReturns.refundAmount,
        refundEta: taxReturns.refundEta,
        createdAt: taxReturns.createdAt,
      })
      .from(taxReturns)
      .where(and(eq(taxReturns.userId, userId), eq(taxReturns.taxYear, year))!)
      .orderBy(desc(taxReturns.createdAt));

    // uniq per user/year means 0 or 1 row, but return consistently
    return NextResponse.json(rows[0] ?? null);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch return status" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // TODO: verify admin here (your role check)
    // if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { userId, year, status, refundAmount, refundEta } = body;

    if (!userId || !year) {
      return NextResponse.json({ error: "Missing userId/year" }, { status: 400 });
    }

    const y = Number(year);
    if (!Number.isInteger(y)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    // update existing row for (userId, taxYear)
    const updated = await db
      .update(taxReturns)
      .set({
        ...(status ? { status } : {}),
        ...(refundAmount !== undefined ? { refundAmount } : {}),
        ...(refundEta !== undefined ? { refundEta } : {}),
      })
      .where(and(eq(taxReturns.userId, userId), eq(taxReturns.taxYear, y))!)
      .returning({
        id: taxReturns.id,
        userId: taxReturns.userId,
        taxYear: taxReturns.taxYear,
        status: taxReturns.status,
        refundAmount: taxReturns.refundAmount,
        refundEta: taxReturns.refundEta,
      });

    return NextResponse.json(updated[0] ?? null);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update return status" },
      { status: 500 }
    );
  }
}
