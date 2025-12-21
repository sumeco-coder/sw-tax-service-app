"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import { socialPosts } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

type Provider = "facebook" | "instagram" | "x";

function toUtcIsoFromLocalDateTime(local: string, tzOffsetMinutes: number) {
  // local: "YYYY-MM-DDTHH:mm"
  const [datePart, timePart] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);

  // getTimezoneOffset() returns minutes to add to local time to get UTC
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) + tzOffsetMinutes * 60_000;
  return new Date(utcMs).toISOString();
}

function parseMediaUrls(raw: string) {
  const cleaned = (raw ?? "").trim();
  if (!cleaned) return [];
  return cleaned
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function reval() {
  revalidatePath("/admin/social");
  revalidatePath("/admin");
}

export async function createSocialPostAction(formData: FormData): Promise<void> {
  const providerRaw = String(formData.get("provider") ?? "x");
  const provider: Provider =
    providerRaw === "facebook" || providerRaw === "instagram" ? providerRaw : "x";

  const textBody = String(formData.get("textBody") ?? "").trim();
  if (!textBody) return;

  const triggerKey = String(formData.get("triggerKey") ?? "manual").trim() || "manual";

  const mediaUrls = parseMediaUrls(String(formData.get("mediaUrls") ?? ""));

  const scheduledAtLocal = String(formData.get("scheduledAtLocal") ?? "").trim();
  const tzOffsetMin = Number(formData.get("tzOffsetMin") ?? 0);

  const scheduledAt =
    scheduledAtLocal ? new Date(toUtcIsoFromLocalDateTime(scheduledAtLocal, tzOffsetMin)) : null;

  await db.insert(socialPosts).values({
    provider,
    triggerKey,
    status: "queued",
    scheduledAt,
    textBody,
    mediaUrls,
    attempts: 0, 
    result: null,
    error: null,
    sentAt: null,
    updatedAt: new Date(),
  });

  reval();
}

export async function cancelSocialPostAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await db
    .update(socialPosts)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(socialPosts.id, id));

  reval();
}

export async function requeueSocialPostAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await db
    .update(socialPosts)
    .set({
      status: "queued",
      error: null,
      result: null,
      sentAt: null,
      updatedAt: new Date(),
    })
    .where(eq(socialPosts.id, id));

  reval();
}

export async function deleteSocialPostAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await db.delete(socialPosts).where(eq(socialPosts.id, id));
  reval();
}
