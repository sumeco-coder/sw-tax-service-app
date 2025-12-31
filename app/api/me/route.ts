// app/api/me/route.ts
import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/getServerUser";

export const runtime = "nodejs";

export async function GET() {
  const me = await getServerUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ user: me }, { status: 200 });
}
