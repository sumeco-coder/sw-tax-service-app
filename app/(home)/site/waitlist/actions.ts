// app/(home)/site/waitlist/actions.ts
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
  if (!data?.fullName?.trim() || !data?.email?.trim()) {
    throw new Error("Name and email are required.");
  }

  const fullName = data.fullName.trim();
  const email = data.email.toLowerCase().trim();

  // convert empty strings to null
  const phone = data.phone?.trim() ? data.phone.trim() : null;
  const plan = data.plan?.trim() ? data.plan.trim() : null;
  const notes = data.notes?.trim() ? data.notes.trim() : null;
  const agencyId = data.agencyId?.trim() ? data.agencyId.trim() : null;

  try {
    const [row] = await db
      .insert(waitlist)
      .values({
        fullName,
        email,
        phone,
        roleType: data.roleType ?? "taxpayer",
        plan,
        notes,
        agencyId,
        status: "pending",
      })
      .returning();

    return row;
 } catch (err: any) {
  console.error("waitlist insert error:", err); // shows the real postgres error
  throw err; // temporary
}

}
