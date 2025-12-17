// app/(admin)/admin/settings/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import { appSettings } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

import {
  getWaitlistConfig,
  setWaitlistMode,
  setWaitlistOpen,
  setWaitlistSchedule,
} from "@/lib/waitlist/config";

function toUtcIsoFromLocalDateTime(local: string, tzOffsetMinutes: number) {
  const [datePart, timePart] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);

  const utcMs = Date.UTC(y, m - 1, d, hh, mm) + tzOffsetMinutes * 60_000;
  return new Date(utcMs).toISOString();
}

function reval() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/waitlist");
  revalidatePath("/waitlist");
  revalidatePath("/admin");
}

/* ---------------------------
   Existing waitlist controls
---------------------------- */

export async function toggleWaitlistOpenAction(): Promise<void> {
  const cfg = await getWaitlistConfig();
  await setWaitlistOpen(!cfg.manualOpen);
  reval();
}

export async function setWaitlistModeAction(formData: FormData): Promise<void> {
  const modeRaw = (formData.get("mode") as string | null) ?? "instant";
  const mode = modeRaw === "bulk" ? "bulk" : "instant";
  await setWaitlistMode(mode);
  reval();
}

export async function saveWaitlistScheduleAction(formData: FormData): Promise<void> {
  const openAtLocal = (formData.get("openAtLocal") as string | null)?.trim() || "";
  const closeAtLocal = (formData.get("closeAtLocal") as string | null)?.trim() || "";
  const tzOffsetMin = Number(formData.get("tzOffsetMin") ?? 0);

  const openAtUtcIso = openAtLocal
    ? toUtcIsoFromLocalDateTime(openAtLocal, tzOffsetMin)
    : null;

  const closeAtUtcIso = closeAtLocal
    ? toUtcIsoFromLocalDateTime(closeAtLocal, tzOffsetMin)
    : null;

  await setWaitlistSchedule(openAtUtcIso, closeAtUtcIso);
  reval();
}

export async function clearWaitlistScheduleAction(): Promise<void> {
  await setWaitlistSchedule(null, null);
  reval();
}

export async function resetAppSettingsAction(): Promise<void> {
  await setWaitlistOpen(false);
  await setWaitlistMode("instant");
  await setWaitlistSchedule(null, null);
  reval();
}

/* ---------------------------
   NEW: Inline editor actions
---------------------------- */

/**
 * Upsert any app_settings key/value.
 * Used by inline editor rows + "Add new setting" form.
 */
export async function upsertAppSettingAction(formData: FormData): Promise<void> {
  const key = (formData.get("key") as string | null)?.trim() ?? "";
  const value = (formData.get("value") as string | null) ?? "";

  if (!key) return;

  const existing = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);

  if (existing.length) {
    await db
      .update(appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({
      key,
      value,
      updatedAt: new Date(),
    });
  }

  reval();
}

/**
 * Delete a setting by key.
 */
export async function deleteAppSettingAction(formData: FormData): Promise<void> {
  const key = (formData.get("key") as string | null)?.trim() ?? "";
  if (!key) return;

  await db.delete(appSettings).where(eq(appSettings.key, key));
  reval();
}
