import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  // 1) verify admin (your auth check here)
  // if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { userId, year, refundAmount, refundEta } = body;

  // 2) validate
  if (!userId || !year) {
    return NextResponse.json({ error: "Missing userId/year" }, { status: 400 });
  }

  // 3) update DB record for (userId, year)
  // await db.returnStatus.upsert({ ... })

  return NextResponse.json({ ok: true });
}
