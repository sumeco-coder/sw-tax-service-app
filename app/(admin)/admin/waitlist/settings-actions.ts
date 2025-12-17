// app/(admin)/waitlist/settings-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import { waitlist } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { approveWaitlistAndCreateInvite } from "./actions";
import { getWaitlistConfig, setWaitlistMode, setWaitlistOpen } from "@/lib/waitlist/config";

export async function toggleWaitlistOpenAction(): Promise<void> {
  const cfg = await getWaitlistConfig();
  await setWaitlistOpen(!cfg.manualOpen);

  revalidatePath("/waitlist");
  revalidatePath("/admin/waitlist");
  revalidatePath("/admin");
}

export async function setWaitlistModeAction(formData: FormData): Promise<void> {
  const modeRaw = (formData.get("mode") as string | null) ?? "instant";
  const mode = modeRaw === "bulk" ? "bulk" : "instant";

  await setWaitlistMode(mode);

  revalidatePath("/waitlist");
  revalidatePath("/admin/waitlist");
  revalidatePath("/admin");
}

export async function sendPendingInvitesAction(formData: FormData): Promise<void> {
  const limit = Number(formData.get("limit") ?? 50) || 50;

  const pending = await db
    .select()
    .from(waitlist)
    .where(eq(waitlist.status, "pending"))
    .limit(limit);

  for (const row of pending) {
    await approveWaitlistAndCreateInvite(row.id);
  }

  revalidatePath("/waitlist");
  revalidatePath("/admin/waitlist");
  revalidatePath("/admin");
}
