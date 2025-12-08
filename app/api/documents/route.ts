// app/api/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { documents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { displayName, docType, taxYear, key, fileName, mimeType, size } = body;

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    // TODO: pull real user id from auth
    const userId = "TODO-user-id";

    const [inserted] = await db
      .insert(documents)
      .values({
        userId,
        taxYear: taxYear ?? null,
        key,
        docType: docType ?? "OTHER",
        displayName: displayName ?? null,
        fileName,
        mimeType,
        size,
      })
      .returning();

    // Build URL if your bucket is public or via a CDN
    const url =
      process.env.DOCS_PUBLIC_BASE_URL &&
      `${process.env.DOCS_PUBLIC_BASE_URL}/${inserted.key}`;

    return NextResponse.json({
      id: inserted.id,
      displayName: inserted.displayName,
      docType: inserted.docType,
      taxYear: inserted.taxYear,
      url,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save document" },
      { status: 500 }
    );
  }
}
