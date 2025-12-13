// app/(home)/site/waitlist/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { waitlist } from "@/drizzle/schema";

function maskEmail(email?: string) {
  if (!email) return null;
  const [u, d] = email.split("@");
  if (!u || !d) return "***";
  return `${u.slice(0, 2)}***@${d}`;
}
function maskPhone(phone?: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-4)}` : "***";
}

export async function joinWaitlist(data: {
  fullName: string;
  email: string;
  phone?: string;
  plan?: string;
  notes?: string;
  roleType?: "taxpayer" | "business" | "other";
  agencyId?: string;
}) {
  try {
    // ✅ validate early (prevents undefined surprises)
    if (!data?.fullName || !data?.email) {
      throw new Error("Name and email are required.");
    }

    const [row] = await db
      .insert(waitlist)
      .values({
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        phone: data.phone ?? null,
        roleType: data.roleType ?? "taxpayer",
        plan: data.plan ?? null,
        notes: data.notes ?? null,
        agencyId: data.agencyId ?? null,
        status: "pending",
      })
      .returning();

    return row;
  } catch (err) {
    console.error("joinWaitlist failed", {
      errName: err instanceof Error ? err.name : typeof err,
      errMessage: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      // log *shape* (masked) so you can see what's missing without leaking PII
      dataKeys: data && typeof data === "object" ? Object.keys(data) : null,
      sample: {
        fullName: data?.fullName ? `${data.fullName.slice(0, 2)}***` : null,
        email: maskEmail(data?.email),
        phone: maskPhone(data?.phone),
        plan: data?.plan ?? null,
        roleType: data?.roleType ?? null,
        agencyId: data?.agencyId ?? null,
      },
    });
    throw err;
  }
}
