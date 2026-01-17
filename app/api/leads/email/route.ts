import { NextResponse } from "next/server";
import { upsertEmailLead } from "@/lib/leads/upsertEmailLead.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstIpFromXff(xff: string | null) {
  if (!xff) return null;
  const first = xff.split(",")[0]?.trim();
  return first || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const headers = req.headers;
    const ip =
      firstIpFromXff(headers.get("x-forwarded-for")) ||
      headers.get("x-real-ip") ||
      null;

    const userAgent = headers.get("user-agent") || null;
    const referrer = headers.get("referer") || null;

    const id = await upsertEmailLead({
      email: String(body?.email ?? ""),
      source: typeof body?.source === "string" ? body.source : "unknown",
      marketingOptIn:
        typeof body?.marketingOptIn === "boolean" ? body.marketingOptIn : undefined,
      utm: body?.utm ?? {},
      ip,
      userAgent,
      referrer,
    });

    if (!id) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}
