// app/(admin)/admin/protected/waitlist/schedule-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { setWaitlistSchedule } from "@/lib/waitlist/config";

function toUtcIsoFromLocalDateTime(local: string, tzOffsetMinutes: number) {
  // local: "YYYY-MM-DDTHH:mm"
  const [datePart, timePart] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);

  // Treat the entered time as "local" and convert to UTC using the browser offset.
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) + tzOffsetMinutes * 60_000;
  return new Date(utcMs).toISOString();
}

export async function saveWaitlistScheduleAction(formData: FormData) {
  const openAtLocal = (formData.get("openAtLocal") as string | null)?.trim() || "";
  const closeAtLocal = (formData.get("closeAtLocal") as string | null)?.trim() || "";
  const tzOffsetMin = Number(formData.get("tzOffsetMin") ?? 0);

  const openAtUtcIso = openAtLocal ? toUtcIsoFromLocalDateTime(openAtLocal, tzOffsetMin) : null;
  const closeAtUtcIso = closeAtLocal ? toUtcIsoFromLocalDateTime(closeAtLocal, tzOffsetMin) : null;

  await setWaitlistSchedule(openAtUtcIso, closeAtUtcIso);

  revalidatePath("/waitlist");
  revalidatePath("/admin/waitlist");
  revalidatePath("/admin");
}

export async function clearWaitlistScheduleAction() {
  await setWaitlistSchedule(null, null);
  revalidatePath("/waitlist");
  revalidatePath("/admin/waitlist");
  revalidatePath("/admin");
}
