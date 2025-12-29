// app/(site)/waitlist/actions.ts  (or app/(home)/site/waitlist/actions.ts)
"use server";

import { db } from "@/drizzle/db";
import { waitlist } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { getWaitlistConfig } from "@/lib/waitlist/config";

// ✅ import from lib, not from app routes
import { approveWaitlistAndCreateInvite } from "@/lib/waitlist/approveInvite.server";

const WaitlistInput = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name."),
    email: z.string().trim().toLowerCase().email("Please enter a valid email address."),

    phone: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),
    plan: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),
    notes: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),

    roleType: z.enum(["taxpayer", "business", "other"]).optional(),
    agencyId: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),

    utmSource: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),
    utmMedium: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),
    utmCampaign: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),
    utmContent: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),
    utmTerm: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),

    gclid: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),
    fbclid: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),

    landingPath: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),
    referrer: z.string().trim().optional().transform((v) => (v && v.length ? v : undefined)),
  })
  .strict();

export async function joinWaitlist(data: {
  fullName: string;
  email: string;
  phone?: string;
  plan?: string;
  notes?: string;
  roleType?: "taxpayer" | "business" | "other";
  agencyId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  fbclid?: string;
  landingPath?: string;
  referrer?: string;
}) {
  const parsed = WaitlistInput.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid form data.");
  }

  // ✅ DB config controls behavior (admin dashboard + site use same source)
  const cfg = await getWaitlistConfig();
  const shouldAutoInvite = cfg.open && cfg.mode === "instant";

  const {
    fullName,
    plan,
    notes,
    roleType,
    agencyId,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    gclid,
    fbclid,
    landingPath,
    referrer,
  } = parsed.data;

  const email = parsed.data.email.trim().toLowerCase();

  // ✅ phone optional → normalize to E.164
  let phoneE164: string | null = null;
  if (parsed.data.phone) {
    const digits = parsed.data.phone.trim().replace(/\D/g, "");
    if (digits.length !== 10) {
      throw new Error("Phone must be 10 digits (ex: 678-546-4528) or leave it blank.");
    }
    const pn = parsePhoneNumberFromString(digits, "US");
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

    // ✅ If they already exist, update missing fields (no duplicates)
    if (existing) {
      const updates: Record<string, any> = {};

      if (!existing.phone && phoneE164) updates.phone = phoneE164;
      if (!existing.plan && plan) updates.plan = plan;
      if ((!existing.notes || existing.notes.length === 0) && notes) updates.notes = notes;
      if (!existing.agencyId && agencyId) updates.agencyId = agencyId;

      if (!existing.utmSource && utmSource) updates.utmSource = utmSource;
      if (!existing.utmMedium && utmMedium) updates.utmMedium = utmMedium;
      if (!existing.utmCampaign && utmCampaign) updates.utmCampaign = utmCampaign;
      if (!existing.utmContent && utmContent) updates.utmContent = utmContent;
      if (!existing.utmTerm && utmTerm) updates.utmTerm = utmTerm;

      if (!existing.gclid && gclid) updates.gclid = gclid;
      if (!existing.fbclid && fbclid) updates.fbclid = fbclid;

      if (!existing.landingPath && landingPath) updates.landingPath = landingPath;
      if (!existing.referrer && referrer) updates.referrer = referrer;

      let row = existing;
      if (Object.keys(updates).length) {
        const [updated] = await db
          .update(waitlist)
          .set(updates)
          .where(eq(waitlist.id, existing.id))
          .returning();
        if (updated) row = updated;
      }

      // ✅ only auto-invite when OPEN + INSTANT, and only if pending
      if (shouldAutoInvite && row.status === "pending") {
        try {
          await approveWaitlistAndCreateInvite(row.id);
        } catch (err) {
          console.error("auto-invite failed:", err);
        }
      }

      return row;
    }

    const [row] = await db
      .insert(waitlist)
      .values({
        fullName,
        email,
        phone: phoneE164,
        roleType: roleType ?? "taxpayer",
        plan: plan ?? null,
        notes: notes ?? null,
        agencyId: agencyId ?? null,
        status: "pending",

        utmSource: utmSource ?? null,
        utmMedium: utmMedium ?? null,
        utmCampaign: utmCampaign ?? null,
        utmContent: utmContent ?? null,
        utmTerm: utmTerm ?? null,

        gclid: gclid ?? null,
        fbclid: fbclid ?? null,
        landingPath: landingPath ?? null,
        referrer: referrer ?? null,
      })
      .returning();

    if (shouldAutoInvite) {
      try {
        await approveWaitlistAndCreateInvite(row.id);
      } catch (err) {
        console.error("auto-invite failed:", err);
      }
    }

    return row;
  } catch (err: any) {
    if (err?.code === "23505") throw new Error("You’re already on the waitlist.");
    console.error("waitlist insert error:", err);
    throw new Error("Something went wrong. Please try again.");
  }
}
