// app/(client)/onboarding/schedule/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { appointments, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendAppointmentEmail } from "@/lib/email/appointments";
import { sendSms } from "@/lib/sms/sns";

/**
 * BOOK APPOINTMENT
 * Expects form fields:
 * - cognitoSub (string)
 * - email (string, optional if already on user)
 * - phone (string, optional)
 * - scheduledAt (ISO string)
 */
export async function bookAppointment(formData: FormData): Promise<void> {
  const cognitoSub = (formData.get("cognitoSub") as string | null)?.trim();
  const emailFromForm = (formData.get("email") as string | null) ?? "";
  const phoneFromForm = (formData.get("phone") as string | null) ?? "";
  const scheduledAtIso = formData.get("scheduledAt") as string | null;

  if (!cognitoSub || !scheduledAtIso) {
    console.error("Missing booking data", { cognitoSub, scheduledAtIso });
    return;
  }

  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) {
    console.error("bookAppointment: invalid datetime", scheduledAtIso);
    return;
  }

  // Ensure user exists in DB (linked to Cognito sub)
  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (!userRow) {
    console.error("User record not found for scheduling", { cognitoSub });
    return;
  }

  const email = emailFromForm || userRow.email || "";
  const phone = phoneFromForm || (userRow as any).phone || "";

  // Create appointment (single start time + duration)
  const DEFAULT_DURATION_MINUTES = 30;

  // ✅ Insert + return appointment id (needed for email params)
  const [appt] = await db
    .insert(appointments)
    .values({
      userId: userRow.id,
      scheduledAt,
      durationMinutes: DEFAULT_DURATION_MINUTES,
      status: "scheduled",
      notes: null,
      cancelledReason: null,
      cancelledAt: null,
    })
    .returning({
      id: appointments.id,
      scheduledAt: appointments.scheduledAt,
      durationMinutes: appointments.durationMinutes,
    });

  if (!appt?.id) {
    console.error("Appointment insert failed (no id returned)");
    return;
  }

  await db
    .update(users)
    .set({
      onboardingStep: "DONE",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userRow.id));

  const endsAt = new Date(
    scheduledAt.getTime() + DEFAULT_DURATION_MINUTES * 60000
  );

  // Email
  if (email) {
    await sendAppointmentEmail({
      to: email,
      kind: "BOOKED",
      appointmentId: appt.id, // ✅ required
      startsAt: scheduledAt,
      endsAt,
    });
  }

  // SMS
  if (phone) {
    await sendSms(
      phone,
      `Your SW Tax Service appointment is booked for ${scheduledAt.toLocaleString()}.`
    );
  }

  revalidatePath("/onboarding/schedule");
}

/**
 * CANCEL APPOINTMENT
 * Expects form fields:
 * - appointmentId (string)
 * - reason? (string)
 */
export async function cancelAppointment(formData: FormData): Promise<void> {
  const apptId = formData.get("appointmentId") as string | null;
  const reason =
    (formData.get("reason") as string | null)?.trim() ||
    "Client cancelled from onboarding portal";

  if (!apptId) {
    console.error("cancelAppointment: missing appointmentId");
    return;
  }

  // Load appointment
  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, apptId))
    .limit(1);

  if (!appt) {
    console.error("Appointment not found for cancel", { apptId });
    return;
  }

  // Load user for email/phone
  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, appt.userId))
    .limit(1);

  // Mark cancelled
  const now = new Date();
  await db
    .update(appointments)
    .set({
      status: "cancelled",
      cancelledReason: reason,
      cancelledAt: now,
      updatedAt: now,
    })
    .where(eq(appointments.id, apptId));

  const email = (userRow as any)?.email ?? "";
  const phone = (userRow as any)?.phone ?? "";

  // Email notification
  if (email) {
    const startsAt = appt.scheduledAt;
    const endsAt = new Date(
      appt.scheduledAt.getTime() + (appt.durationMinutes ?? 30) * 60000
    );

    await sendAppointmentEmail({
      to: email,
      kind: "CANCELLED",
      appointmentId: apptId, // ✅ required
      startsAt,
      endsAt,
      cancelReason: reason,
    });
  }

  // SMS notification
  if (phone) {
    await sendSms(
      phone,
      `Your SW Tax Service appointment on ${appt.scheduledAt.toLocaleString()} was cancelled.`
    );
  }

  revalidatePath("/onboarding/schedule");
}

/**
 * RESCHEDULE APPOINTMENT
 * Expects form fields:
 * - appointmentId (string)
 * - scheduledAt (ISO string)
 */
export async function rescheduleAppointment(formData: FormData): Promise<void> {
  const apptId = formData.get("appointmentId") as string | null;
  const scheduledAtIso = formData.get("scheduledAt") as string | null;

  if (!apptId || !scheduledAtIso) {
    console.error("Missing reschedule data", { apptId, scheduledAtIso });
    return;
  }

  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) {
    console.error("Invalid reschedule datetime", scheduledAtIso);
    return;
  }

  // Load appointment
  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, apptId))
    .limit(1);

  if (!appt) {
    console.error("Appointment not found for reschedule", { apptId });
    return;
  }

  // Load user
  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, appt.userId))
    .limit(1);

  const now = new Date();
  await db
    .update(appointments)
    .set({
      scheduledAt,
      status: "scheduled",
      cancelledReason: null,
      cancelledAt: null,
      updatedAt: now,
    })
    .where(eq(appointments.id, apptId));

  const email = (userRow as any)?.email ?? "";
  const phone = (userRow as any)?.phone ?? "";

  const durationMinutes = appt.durationMinutes ?? 30;
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60000);

  // Email
  if (email) {
    await sendAppointmentEmail({
      to: email,
      kind: "RESCHEDULED",
      appointmentId: apptId, // ✅ required
      startsAt: scheduledAt,
      endsAt,
    });
  }

  // SMS
  if (phone) {
    await sendSms(
      phone,
      `Your SW Tax Service appointment was rescheduled to ${scheduledAt.toLocaleString()}.`
    );
  }

  revalidatePath("/onboarding/schedule");
}
