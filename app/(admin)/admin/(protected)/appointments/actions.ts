"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/drizzle/db";
import { appointments, appointmentRequests, appointmentSlots,} from "@/drizzle/schema";
import { eq } from "drizzle-orm";

// Your actual statuses:
const APPT_ALLOWED = new Set(["scheduled", "completed", "cancelled", "no_show"]);
const REQ_ALLOWED = new Set(["requested", "confirmed", "cancelled"]);
const SLOT_ALLOWED = new Set(["open", "blocked"]);

export async function setAppointmentStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!id) throw new Error("Missing appointment id");
  if (!APPT_ALLOWED.has(status)) throw new Error("Invalid appointment status");

  await db
    .update(appointments)
    .set({
      status: status as any,
      cancelledAt: status === "cancelled" ? new Date() : null,
      // optional: keep cancelledReason as-is; add a separate admin UI later to set reason
    })
    .where(eq(appointments.id, id));

  revalidatePath("/admin/appointments");
}

export async function setRequestStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!id) throw new Error("Missing request id");
  if (!REQ_ALLOWED.has(status)) throw new Error("Invalid request status");

  await db
    .update(appointmentRequests)
    .set({ status })
    .where(eq(appointmentRequests.id, id));

  revalidatePath("/admin/appointments");
}

export async function setSlotStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!id) throw new Error("Missing slot id");
  if (!SLOT_ALLOWED.has(status)) throw new Error("Invalid slot status");

  await db
    .update(appointmentSlots)
    .set({ status: status as any })
    .where(eq(appointmentSlots.id, id));

  revalidatePath("/admin/appointments");
}