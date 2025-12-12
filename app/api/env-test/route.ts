// app/api/env-test/route.ts
import { NextResponse } from "next/server";
import { DATABASE_URL } from "@/env.server";

export async function GET() {
  return NextResponse.json({
    hasDatabaseUrl: true,
    databaseUrlSample: DATABASE_URL.slice(0, 40) + "...",
  });
}
