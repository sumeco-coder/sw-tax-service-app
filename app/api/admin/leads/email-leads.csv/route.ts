import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { emailLeads } from "@/drizzle/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const source = (url.searchParams.get("source") ?? "").trim();
  const optin = url.searchParams.get("optin") === "1";

  const where = and(
    q
      ? or(
          ilike(emailLeads.emailLower, `%${q}%`),
          ilike(emailLeads.email, `%${q}%`),
          ilike(emailLeads.source, `%${q}%`)
        )
      : undefined,
    source ? eq(emailLeads.source, source) : undefined,
    optin ? eq(emailLeads.marketingOptIn, true) : undefined
  );

  const rows = await db
    .select()
    .from(emailLeads)
    .where(where)
    .orderBy(desc(emailLeads.lastSeenAt))
    .limit(5000);

  const header = [
    "email",
    "email_lower",
    "source",
    "marketing_opt_in",
    "submit_count",
    "first_seen_at",
    "last_seen_at",
    "referrer",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  const lines = [header.join(",")];

  for (const r of rows) {
    const utm = (r.utm as any) ?? {};
    lines.push(
      [
        csvEscape(r.email),
        csvEscape(r.emailLower),
        csvEscape(r.source),
        csvEscape(r.marketingOptIn ? "true" : "false"),
        csvEscape(r.submitCount),
        csvEscape(r.firstSeenAt ? new Date(r.firstSeenAt as any).toISOString() : ""),
        csvEscape(r.lastSeenAt ? new Date(r.lastSeenAt as any).toISOString() : ""),
        csvEscape(r.referrer ?? ""),
        csvEscape(utm.utm_source ?? ""),
        csvEscape(utm.utm_medium ?? ""),
        csvEscape(utm.utm_campaign ?? ""),
        csvEscape(utm.utm_term ?? ""),
        csvEscape(utm.utm_content ?? ""),
      ].join(",")
    );
  }

  const csv = lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="email-leads.csv"`,
      "cache-control": "no-store",
    },
  });
}
