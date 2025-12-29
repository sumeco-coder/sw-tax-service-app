// app/(admin)/admin/(protected)/waitlist/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import { waitlist } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

import { approveWaitlistAndCreateInvite as approveInLib } from "@/lib/waitlist/approveInvite.server";

function cleanId(id: unknown) {
  return String(id ?? "").trim();
}

export async function resetWaitlistToPending(id: string) {
  const wid = cleanId(id);
  if (!wid) return;

  await db
    .update(waitlist)
    .set({ status: "pending", updatedAt: new Date() })
    .where(eq(waitlist.id, wid));

  revalidatePath("/admin/waitlist");
  revalidatePath("/waitlist");
  revalidatePath("/admin");
}

export async function archiveWaitlist(id: string) {
  const wid = cleanId(id);
  if (!wid) return;

  await db
    .update(waitlist)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(waitlist.id, wid));

  revalidatePath("/admin/waitlist");
  revalidatePath("/waitlist");
  revalidatePath("/admin");
}

export async function deleteWaitlistHard(id: string) {
  const wid = cleanId(id);
  if (!wid) return;

  await db.delete(waitlist).where(eq(waitlist.id, wid));

  revalidatePath("/admin/waitlist");
  revalidatePath("/waitlist");
  revalidatePath("/admin");
}

export async function approveWaitlistAndCreateInvite(waitlistId: string) {
  const res = await approveInLib(waitlistId, { invitedBy: "admin", inviteType: "taxpayer" });

  revalidatePath("/admin/waitlist");
  revalidatePath("/admin");
  revalidatePath("/waitlist");

  return res;
}

export async function rejectWaitlist(waitlistId: string) {
  await db
    .update(waitlist)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(waitlist.id, waitlistId));

  revalidatePath("/admin/waitlist");
  revalidatePath("/admin");
  revalidatePath("/waitlist");
}
