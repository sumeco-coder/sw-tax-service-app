// app/api/tax-calculator/lead/route.ts
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { taxCalculatorLeads } from "@/drizzle/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function firstIpFromXff(xff: string | null) {
  if (!xff) return null;
  // "client, proxy1, proxy2"
  const first = xff.split(",")[0]?.trim();
  return first || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const rawEmail = String(body?.email ?? "").trim();
    const emailLower = rawEmail.toLowerCase();

    if (!rawEmail || !isValidEmail(emailLower)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email" },
        { status: 400 }
      );
    }

    // Pull optional tracking from request headers
    const headers = req.headers;
    const ip =
      firstIpFromXff(headers.get("x-forwarded-for")) ||
      headers.get("x-real-ip") ||
      null;

    const userAgent = headers.get("user-agent") || null;
    const referrer = headers.get("referer") || null;

    // Safe snapshot (no SSNs) — accept only expected keys
    const s = body?.snapshot ?? {};
    const snapshot = {
      filingStatus: typeof s?.filingStatus === "string" ? s.filingStatus : undefined,
      w2Income: typeof s?.w2Income === "number" ? s.w2Income : undefined,
      selfEmployedIncome: typeof s?.selfEmployedIncome === "number" ? s.selfEmployedIncome : undefined,
      withholding: typeof s?.withholding === "number" ? s.withholding : undefined,
      dependentsCount: typeof s?.dependentsCount === "number" ? s.dependentsCount : undefined,
      otherDependentsCount: typeof s?.otherDependentsCount === "number" ? s.otherDependentsCount : undefined,
      useMultiW2: typeof s?.useMultiW2 === "boolean" ? s.useMultiW2 : undefined,
      w2sCount: typeof s?.w2sCount === "number" ? s.w2sCount : undefined,
    };

    // UTM (optional) — allow only expected keys
    const u = body?.utm ?? {};
    const utm = {
      utm_source: typeof u?.utm_source === "string" ? u.utm_source : undefined,
      utm_medium: typeof u?.utm_medium === "string" ? u.utm_medium : undefined,
      utm_campaign: typeof u?.utm_campaign === "string" ? u.utm_campaign : undefined,
      utm_term: typeof u?.utm_term === "string" ? u.utm_term : undefined,
      utm_content: typeof u?.utm_content === "string" ? u.utm_content : undefined,
    };

    const source =
      typeof body?.source === "string" && body.source.trim()
        ? body.source.trim()
        : "tax-calculator";

    const marketingOptIn = Boolean(body?.marketingOptIn);

    await db
      .insert(taxCalculatorLeads)
      .values({
        email: rawEmail,
        emailLower,
        snapshot,
        utm,
        source,
        marketingOptIn,
        ip,
        userAgent,
        referrer,
      })
      .onConflictDoUpdate({
        target: taxCalculatorLeads.emailLower,
        set: {
          // keep latest casing too
          email: rawEmail,
          snapshot,
          utm,
          source,
          marketingOptIn,
          ip,
          userAgent,
          referrer,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Bad request" },
      { status: 400 }
    );
  }
}
