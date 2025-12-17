// lib/waitlist/config.ts
import { db } from "@/drizzle/db";
import { appSettings } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { WaitlistMode } from "@/types/settings";

async function getSetting(key: string) {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);

  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  const existing = await getSetting(key);

  if (existing !== null) {
    await db
      .update(appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({ key, value, updatedAt: new Date() });
  }
}

export async function setWaitlistSchedule(
  openAtUtcIso: string | null,
  closeAtUtcIso: string | null
) {
  await setSetting("waitlistOpenAtUtc", openAtUtcIso ?? "");
  await setSetting("waitlistCloseAtUtc", closeAtUtcIso ?? "");
}

export async function getWaitlistConfig() {
  const openRaw = await getSetting("waitlistOpen");
  const modeRaw = await getSetting("waitlistMode");
  const openAtRaw = await getSetting("waitlistOpenAtUtc");
  const closeAtRaw = await getSetting("waitlistCloseAtUtc");

  const manualOpen = openRaw ? openRaw === "true" : false;
  const mode: WaitlistMode = modeRaw === "bulk" ? "bulk" : "instant";

  const openAtUtc = openAtRaw?.trim() ? new Date(openAtRaw) : null;
  const closeAtUtc = closeAtRaw?.trim() ? new Date(closeAtRaw) : null;

  const now = new Date();
  const scheduleOpen =
    !!openAtUtc && now >= openAtUtc && (!closeAtUtc || now < closeAtUtc);

  const open = manualOpen || scheduleOpen;

  return { open, mode, manualOpen, scheduleOpen, openAtUtc, closeAtUtc };
}

export async function setWaitlistOpen(open: boolean) {
  await setSetting("waitlistOpen", open ? "true" : "false");
}

export async function setWaitlistMode(mode: WaitlistMode) {
  await setSetting("waitlistMode", mode);
}
