import { db } from "@/drizzle/db";
import { emailLeads } from "@/drizzle/schema";
import { sql } from "drizzle-orm";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function upsertEmailLead(input: {
  email: string;
  source?: string;
  marketingOptIn?: boolean; // only update if provided
  utm?: Partial<{
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_term: string;
    utm_content: string;
  }>;
  ip?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
}) {
  const rawEmail = String(input.email ?? "").trim();
  const emailLower = rawEmail.toLowerCase();

  if (!rawEmail || !isValidEmail(emailLower)) return null;

  const source = (input.source ?? "").trim() || "unknown";

  const utm = input.utm ?? {};
  const utmClean = {
    utm_source: typeof utm.utm_source === "string" ? utm.utm_source : undefined,
    utm_medium: typeof utm.utm_medium === "string" ? utm.utm_medium : undefined,
    utm_campaign: typeof utm.utm_campaign === "string" ? utm.utm_campaign : undefined,
    utm_term: typeof utm.utm_term === "string" ? utm.utm_term : undefined,
    utm_content: typeof utm.utm_content === "string" ? utm.utm_content : undefined,
  };

  const hasUtm = Object.values(utmClean).some((v) => typeof v === "string" && v.length);

  const marketingOptInProvided =
    typeof input.marketingOptIn === "boolean" ? input.marketingOptIn : undefined;

  const insertValues: any = {
    email: rawEmail,
    emailLower,
    source,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    referrer: input.referrer ?? null,
    lastSeenAt: new Date(),
  };

  if (hasUtm) insertValues.utm = utmClean;
  if (typeof marketingOptInProvided === "boolean")
    insertValues.marketingOptIn = marketingOptInProvided;

  const updateSet: any = {
    email: rawEmail,
    source,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    referrer: input.referrer ?? null,
    lastSeenAt: new Date(),
    submitCount: sql<number>`${emailLeads.submitCount} + 1`,
    updatedAt: new Date(),
  };

  if (hasUtm) updateSet.utm = utmClean;
  if (typeof marketingOptInProvided === "boolean")
    updateSet.marketingOptIn = marketingOptInProvided;

  const [row] = await db
    .insert(emailLeads)
    .values(insertValues)
    .onConflictDoUpdate({
      target: emailLeads.emailLower,
      set: updateSet,
    })
    .returning({ id: emailLeads.id });

  return row?.id ?? null;
}
