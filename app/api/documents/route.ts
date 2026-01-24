// app/api/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { documents } from "@/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { getUserIdFromCookies } from "@/lib/auth/getUserIdFromCookies";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year") ?? searchParams.get("taxYear");

    let where = eq(documents.userId, userId);

    if (yearParam != null) {
      const year = Number(yearParam);
      if (!Number.isInteger(year)) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
      }

      // Drizzle `and()` can be SQL | undefined, so we coalesce back to prior where
      where = and(where, eq(documents.taxYear, year)) ?? where;
    }

    const rows = await db
      .select()
      .from(documents)
      .where(where)
      .orderBy(desc(documents.uploadedAt));

    const base = process.env.DOCS_PUBLIC_BASE_URL;

    return NextResponse.json(
      rows.map((d) => ({
        id: d.id,
        displayName: d.displayName,
        docType: d.docType,
        taxYear: d.taxYear,
        key: d.key,
        fileName: d.fileName,
        mimeType: d.mimeType,
        size: d.size,
        url: base ? `${base}/${d.key}` : d.url ?? null,
        uploadedAt: d.uploadedAt,
      }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { displayName, docType, taxYear, key, fileName, mimeType, size } = body;

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(documents)
      .values({
        userId,
        taxYear: taxYear ?? null,
        key,
        docType: docType ?? "OTHER",
        displayName: displayName ?? null,
        fileName: fileName ?? null,
        mimeType: mimeType ?? null,
        size: size ?? null,
      })
      .returning();

    const url =
      process.env.DOCS_PUBLIC_BASE_URL
        ? `${process.env.DOCS_PUBLIC_BASE_URL}/${inserted.key}`
        : inserted.url ?? null;

    return NextResponse.json({
      id: inserted.id,
      displayName: inserted.displayName,
      docType: inserted.docType,
      taxYear: inserted.taxYear,
      url,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}
