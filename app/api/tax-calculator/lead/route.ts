// app/api/tax-calculator/lead/route.ts
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { taxCalculatorLeads } from "@/drizzle/schema";
import { upsertEmailLead } from "@/lib/leads/upsertEmailLead.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function firstIpFromXff(xff: string | null) {
  if (!xff) return null;
  const first = xff.split(",")[0]?.trim();
  return first || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const rawEmail = String(body?.email ?? "").trim();
    const emailLower = rawEmail.toLowerCase();

    if (!rawEmail || !isValidEmail(emailLower)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const headers = req.headers;
    const ip =
      firstIpFromXff(headers.get("x-forwarded-for")) ||
      headers.get("x-real-ip") ||
      null;

    const userAgent = headers.get("user-agent") || null;
    const referrer = headers.get("referer") || null;

    // Safe snapshot (no SSNs)
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

    // ✅ Estimate summary (optional)
    const e = body?.estimate ?? {};
    const estimate = {
      type: e?.type === "refund" || e?.type === "owe" ? e.type : undefined,
      amount: typeof e?.amount === "number" ? e.amount : undefined,
      totalTax: typeof e?.totalTax === "number" ? e.totalTax : undefined,
      selfEmploymentTax:
        typeof e?.selfEmploymentTax === "number" ? e.selfEmploymentTax : undefined,
      quarterlyPayment:
        typeof e?.quarterlyPayment === "number" ? e.quarterlyPayment : undefined,
    };

    const hasEstimate =
      estimate.type === "refund" ||
      estimate.type === "owe" ||
      typeof estimate.amount === "number" ||
      typeof estimate.totalTax === "number" ||
      typeof estimate.selfEmploymentTax === "number" ||
      typeof estimate.quarterlyPayment === "number";

    const snapshotWithEstimate = hasEstimate ? { ...snapshot, estimate } : snapshot;

    // UTM (optional)
    const u = body?.utm ?? {};
    const utm = {
      utm_source: typeof u?.utm_source === "string" ? u.utm_source : undefined,
      utm_medium: typeof u?.utm_medium === "string" ? u.utm_medium : undefined,
      utm_campaign: typeof u?.utm_campaign === "string" ? u.utm_campaign : undefined,
      utm_term: typeof u?.utm_term === "string" ? u.utm_term : undefined,
      utm_content: typeof u?.utm_content === "string" ? u.utm_content : undefined,
    };

    const sourceProvided =
      typeof body?.source === "string" && body.source.trim()
        ? body.source.trim()
        : undefined;

    const sourceFinal = sourceProvided ?? "tax-calculator";

    // ✅ Only update opt-in if caller provided it
    const marketingOptInProvided =
      typeof body?.marketingOptIn === "boolean" ? body.marketingOptIn : undefined;

        try {
      await upsertEmailLead({
        email: rawEmail,
        source: sourceFinal,
        marketingOptIn: marketingOptInProvided,
        utm,
        ip,
        userAgent,
        referrer,
      });
    } catch {
      // ignore (prevents breaking calculator if email_leads isn't migrated yet)
    }
    
    const insertValues: any = {
      email: rawEmail,
      emailLower,
      snapshot: snapshotWithEstimate,
      ip,
      userAgent,
      referrer,
    };

    // keep defaults if not provided
    if (sourceProvided) insertValues.source = sourceProvided;
    if (Object.values(utm).some((v) => typeof v === "string" && v.length)) insertValues.utm = utm;
    if (typeof marketingOptInProvided === "boolean") insertValues.marketingOptIn = marketingOptInProvided;

    const updateSet: any = {
      email: rawEmail,
      snapshot: snapshotWithEstimate,
      ip,
      userAgent,
      referrer,
      updatedAt: new Date(),
    };

    if (sourceProvided) updateSet.source = sourceProvided;
    if (Object.values(utm).some((v) => typeof v === "string" && v.length)) updateSet.utm = utm;
    if (typeof marketingOptInProvided === "boolean") updateSet.marketingOptIn = marketingOptInProvided;

    await db
      .insert(taxCalculatorLeads)
      .values(insertValues)
      .onConflictDoUpdate({
        target: taxCalculatorLeads.emailLower,
        set: updateSet,
      });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}
