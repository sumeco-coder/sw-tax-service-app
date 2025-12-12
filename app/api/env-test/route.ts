// app/api/env-test/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const hasDatabaseUrl = !!process.env.DATABASE_URL;

  return NextResponse.json({
    hasDatabaseUrl,
    databaseUrlSample: hasDatabaseUrl
      ? process.env.DATABASE_URL?.slice(0, 40) + "...(truncated)"
      : null,
    // Optional: see a few keys, to confirm env injection works at all
    someKeys: Object.keys(process.env).slice(0, 20),
  });
}
