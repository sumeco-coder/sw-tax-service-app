import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { db } from "@/drizzle/db";
import {
  taxReturns,
  documents,
  invoices,
  appointments,
  messages,
  conversations,
} from "@/drizzle/schema";
import { eq, sql, isNotNull } from "drizzle-orm";

export const runtime = "nodejs";

function getAuth(req: NextRequest) {
  const token =
    req.cookies.get("idToken")?.value ||
    req.cookies.get("accessToken")?.value;

  if (!token) return null;

  const payload = decodeJwt(token);
  const userId = typeof payload.sub === "string" ? payload.sub : null;

  const role =
    (payload["custom:role"] as string | undefined) ||
    (payload["role"] as string | undefined) ||
    "";

  const isAdmin = ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"].includes(role);

  return { userId, role, isAdmin };
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: admins can request years for a specific client
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId");
    const userId =
      auth.isAdmin && requestedUserId ? requestedUserId : auth.userId;

    const years = new Set<number>();

    // 1) tax_returns.tax_year
    const r1 = await db
      .select({ year: taxReturns.taxYear })
      .from(taxReturns)
      .where(eq(taxReturns.userId, userId))
      .groupBy(taxReturns.taxYear);

    r1.forEach((x) => years.add(Number(x.year)));

    // 2) documents.tax_year (non-null)
    const r2 = await db
      .select({ year: documents.taxYear })
      .from(documents)
      .where(sql`${documents.userId} = ${userId} AND ${isNotNull(documents.taxYear)}`)
      .groupBy(documents.taxYear);

    r2.forEach((x) => {
      if (x.year != null) years.add(Number(x.year));
    });

    // 3) invoices issued year
    const r3 = await db
      .select({ year: sql<number>`extract(year from ${invoices.issuedAt})` })
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .groupBy(sql`extract(year from ${invoices.issuedAt})`);

    r3.forEach((x) => years.add(Number(x.year)));

    // 4) appointments scheduled year
    const r4 = await db
      .select({ year: sql<number>`extract(year from ${appointments.scheduledAt})` })
      .from(appointments)
      .where(eq(appointments.userId, userId))
      .groupBy(sql`extract(year from ${appointments.scheduledAt})`);

    r4.forEach((x) => years.add(Number(x.year)));

    // 5) messages created year (for conversations owned by client)
    const r5 = await db
      .select({ year: sql<number>`extract(year from ${messages.createdAt})` })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.clientId, userId))
      .groupBy(sql`extract(year from ${messages.createdAt})`);

    r5.forEach((x) => years.add(Number(x.year)));

    // Always include current year so UI dropdown doesn't break
    const currentYear = new Date().getFullYear();
    years.add(currentYear);

    const out = Array.from(years)
      .filter((n) => Number.isInteger(n))
      .sort((a, b) => b - a);

    return NextResponse.json({ years: out });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch tax years" }, { status: 500 });
  }
}
