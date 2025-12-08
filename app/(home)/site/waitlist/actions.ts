"use server";

import { db } from "@/drizzle/db";
import { waitlist } from "@/drizzle/schema";

export async function joinWaitlist(data: {
  fullName: string;
  email: string;
  phone?: string;
  plan?: string;
  notes?: string;
  roleType?: "taxpayer" | "business" | "other";
  agencyId?: string;
}) {
  if (!data.fullName || !data.email) {
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
}