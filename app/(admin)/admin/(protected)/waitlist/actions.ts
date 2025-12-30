// app/(admin)/(protected)/waitlist/actions
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import { waitlist } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  approveWaitlistAndCreateInvite as approveInLib,
  createDirectInviteAndSendEmail as directInviteInLib, 
} from "@/lib/waitlist/approveInvite.server";

function cleanId(id: unknown) {
  return String(id ?? "").trim();
}

function revalidateAll() {
  revalidatePath("/admin/waitlist");
  revalidatePath("/admin");
  revalidatePath("/waitlist");
  revalidatePath("/admin/settings");
}

/** ✅ existing */
export async function resetWaitlistToPending(id: string) {
  const wid = cleanId(id);
  if (!wid) return;

  await db
    .update(waitlist)
    .set({ status: "pending", updatedAt: new Date() })
    .where(eq(waitlist.id, wid));

  revalidateAll();
}

export async function archiveWaitlist(id: string) {
  const wid = cleanId(id);
  if (!wid) return;

  await db
    .update(waitlist)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(waitlist.id, wid));

  revalidateAll();
}

export async function deleteWaitlistHard(id: string) {
  const wid = cleanId(id);
  if (!wid) return;

  await db.delete(waitlist).where(eq(waitlist.id, wid));
  revalidateAll();
}

export async function approveWaitlistAndCreateInvite(waitlistId: string) {
  const wid = cleanId(waitlistId);
  if (!wid) throw new Error("Missing waitlist id.");

  const res = await approveInLib(wid, {
    invitedBy: "admin",
    inviteType: "taxpayer",
  });

  revalidateAll();
  return res;
}



export async function rejectWaitlist(waitlistId: string) {
  const wid = cleanId(waitlistId);
  if (!wid) return;

  await db
    .update(waitlist)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(waitlist.id, wid));

  revalidateAll();
}

/* ---------------------------
   ✅ NEW: Direct invite (no waitlist)
---------------------------- */
export async function sendDirectInviteAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim() || null;
  const plan = String(formData.get("plan") ?? "").trim() || null;
  const inviteTypeRaw = String(formData.get("inviteType") ?? "taxpayer").trim();

  const inviteType = inviteTypeRaw === "lms-preparer" ? "lms-preparer" : "taxpayer";

  if (!email) throw new Error("Email is required.");

  const res = await directInviteInLib({
    email,
    fullName,
    plan,
    inviteType,
    invitedBy: "admin",
  });

  revalidateAll();
  return res;
}
