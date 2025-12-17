// app/(home)/site/waitlist/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { waitlist } from "@/drizzle/schema";
import { approveWaitlistAndCreateInvite } from "../../../(admin)/admin/waitlist/actions";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";


const WaitlistInput = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address."),

    // optional fields: treat "" as undefined
    phone: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length ? v : undefined)),

    plan: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length ? v : undefined)),

    notes: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length ? v : undefined)),

    roleType: z.enum(["taxpayer", "business", "other"]).optional(),

    agencyId: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length ? v : undefined)),
  })
  .strict();

// ✅ easiest toggle (env var) — later you can swap to DB setting
function isWaitlistOpen() {
  return process.env.WAITLIST_OPEN === "true";
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
  const parsed = WaitlistInput.safeParse(data);
  if (!parsed.success) {
    // show the first (most relevant) validation error
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid form data.");
  }

  const { fullName, email, plan, notes, roleType, agencyId } = parsed.data;

  // ✅ Validate phone (optional) + normalize to E.164
  let phoneE164: string | null = null;
  if (parsed.data.phone) {
    const pn = parsePhoneNumberFromString(parsed.data.phone, "US"); // change default if needed
    if (!pn || !pn.isValid()) {
      throw new Error("Please enter a valid phone number or leave it blank.");
    }
    phoneE164 = pn.number; // +1XXXXXXXXXX
  }

  try {
    const [existing] = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email))
      .limit(1);

    if (existing) {
      // (optional) fill missing fields if they were blank before
      const updates: Record<string, any> = {};
      if (!existing.phone && phoneE164) updates.phone = phoneE164;
      if (!existing.plan && plan) updates.plan = plan;
      if ((!existing.notes || existing.notes.length === 0) && notes)
        updates.notes = notes;
      if (!existing.agencyId && agencyId) updates.agencyId = agencyId;

      let row = existing;
      if (Object.keys(updates).length) {
        const [updated] = await db
          .update(waitlist)
          .set(updates)
          .where(eq(waitlist.id, existing.id))
          .returning();
        if (updated) row = updated;
      }

      // If OPEN and still pending, auto-send invite (no new row created)
      if (isWaitlistOpen() && row.status === "pending") {
        await approveWaitlistAndCreateInvite(row.id);
      }
      return row;
    }

    const [row] = await db
      .insert(waitlist)
      .values({
        fullName,
        email,
        phone: phoneE164, // ✅ E.164 or null
        roleType: roleType ?? "taxpayer",
        plan: plan ?? null,
        notes: notes ?? null,
        agencyId: agencyId ?? null,
        status: "pending",
      })
      .returning();

    // ✅ AUTO INVITE + EMAIL when waitlist is OPEN
    if (isWaitlistOpen()) {
      await approveWaitlistAndCreateInvite(row.id);
    }

    return row;
  } catch (err: any) {
    // Race condition fallback (duplicate email)
    if (err?.code === "23505") {
      throw new Error("You’re already on the waitlist.");
    }

    console.error("waitlist insert error:", err);
    throw new Error("Something went wrong. Please try again.");
  }
}