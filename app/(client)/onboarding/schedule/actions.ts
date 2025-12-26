"use server";

import { db } from "@/drizzle/db";
import { appointments, users } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendAppointmentEmail } from "@/lib/email/appointments";
import { sendSms } from "@/lib/sms/sns";
import { getServerRole } from "@/lib/auth/roleServer";

// ---------- helpers ----------
function clean(v: unknown, max = 500) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}

function normalizeEmail(v: unknown) {
  return clean(v, 255).toLowerCase();
}

function fmtLocal(dt: Date) {
  // show in your timezone (matches your app context)
  return dt.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
}

async function getUserBySubOrThrow(sub: string) {
  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!userRow) throw new Error("User record not found.");

  return userRow;
}

/**
 * ✅ OPTIONAL: SKIP SCHEDULING (mark onboarding done without appointment)
 * No form fields required; uses cookie auth.
 */
export async function skipScheduling(): Promise<void> {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  if (!sub) throw new Error("Unauthorized. Please sign in again.");

  const userRow = await getUserBySubOrThrow(sub);

  await db
    .update(users)
    .set({
      onboardingStep: "DONE" as any, // ✅ make sure enum allows this
      updatedAt: new Date(),
    })
    .where(eq(users.id, userRow.id));

  revalidatePath("/onboarding");
  revalidatePath("/onboarding/schedule");
  revalidatePath("/profile");

  redirect("/profile");
}

/**
 * BOOK APPOINTMENT (still allowed, but optional now)
 * Expects form fields:
 * - scheduledAt (ISO string)
 * Optional form fields:
 * - email, phone (fallbacks)
 *
 * Security:
 * - ignores cognitoSub from the form (uses cookie sub)
 */
export async function bookAppointment(formData: FormData): Promise<void> {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  const cookieEmail = auth?.email ? normalizeEmail(auth.email) : "";
  if (!sub) throw new Error("Unauthorized. Please sign in again.");

  const scheduledAtIso = clean(formData.get("scheduledAt"), 100);
  if (!scheduledAtIso) {
    console.error("bookAppointment: missing scheduledAt");
    return;
  }

  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) {
    console.error("bookAppointment: invalid datetime", scheduledAtIso);
    return;
  }

  const userRow = await getUserBySubOrThrow(sub);

  const emailFromForm = normalizeEmail(formData.get("email"));
  const phoneFromForm = clean(formData.get("phone"), 40);

  const email = cookieEmail || emailFromForm || (userRow as any).email || "";
  const phone = phoneFromForm || (userRow as any).phone || "";

  const DEFAULT_DURATION_MINUTES = 30;

  // ✅ Prevent duplicates: if they already have a scheduled appt, update it instead of inserting another
  const [existingAppt] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.userId, userRow.id), eq(appointments.status, "scheduled")))
    .limit(1);

  let appointmentId = "";
  let finalStartsAt = scheduledAt;
  let durationMinutes = DEFAULT_DURATION_MINUTES;

  if (existingAppt) {
    durationMinutes = (existingAppt as any).durationMinutes ?? DEFAULT_DURATION_MINUTES;

    await db
      .update(appointments)
      .set({
        scheduledAt,
        status: "scheduled",
        cancelledReason: null,
        cancelledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, (existingAppt as any).id));

    appointmentId = (existingAppt as any).id;
  } else {
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

    appointmentId = appt.id;
    finalStartsAt = appt.scheduledAt as any;
    durationMinutes = appt.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  }

  // ✅ Mark onboarding done (since they finished this step)
  await db
    .update(users)
    .set({
      onboardingStep: "DONE" as any, // ✅ make sure enum allows this
      updatedAt: new Date(),
    })
    .where(eq(users.id, userRow.id));

  const endsAt = new Date(finalStartsAt.getTime() + durationMinutes * 60000);

  // Email
  if (email) {
    await sendAppointmentEmail({
      to: email,
      kind: existingAppt ? "RESCHEDULED" : "BOOKED",
      appointmentId,
      startsAt: finalStartsAt,
      endsAt,
    });
  }

  // SMS
  if (phone) {
    const text =
      existingAppt
        ? `Your SW Tax Service appointment was rescheduled to ${fmtLocal(finalStartsAt)}.`
        : `Your SW Tax Service appointment is booked for ${fmtLocal(finalStartsAt)}.`;

    await sendSms(phone, text);
  }

  revalidatePath("/onboarding");
  revalidatePath("/onboarding/schedule");
  revalidatePath("/profile");

  redirect("/profile");
}

/**
 * CANCEL APPOINTMENT
 * Security:
 * - only the owner (cookie sub) can cancel their appointment (or admin)
 */
export async function cancelAppointment(formData: FormData): Promise<void> {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  const role = auth?.role ?? "unknown";
  if (!sub) throw new Error("Unauthorized. Please sign in again.");

  const apptId = clean(formData.get("appointmentId"), 200);
  const reason =
    clean(formData.get("reason"), 300) || "Client cancelled from onboarding portal";

  if (!apptId) {
    console.error("cancelAppointment: missing appointmentId");
    return;
  }

  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, apptId))
    .limit(1);

  if (!appt) {
    console.error("Appointment not found for cancel", { apptId });
    return;
  }

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, (appt as any).userId))
    .limit(1);

  if (!userRow) {
    console.error("cancelAppointment: user not found for appt", { apptId });
    return;
  }

  // ✅ authorization: owner or admin
  if (role !== "admin" && (userRow as any).cognitoSub !== sub) {
    throw new Error("Forbidden.");
  }

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

  if (email) {
    const startsAt = (appt as any).scheduledAt as Date;
    const endsAt = new Date(
      startsAt.getTime() + (((appt as any).durationMinutes ?? 30) as number) * 60000
    );

    await sendAppointmentEmail({
      to: email,
      kind: "CANCELLED",
      appointmentId: apptId,
      startsAt,
      endsAt,
      cancelReason: reason,
    });
  }

  if (phone) {
    await sendSms(
      phone,
      `Your SW Tax Service appointment on ${fmtLocal((appt as any).scheduledAt)} was cancelled.`
    );
  }

  revalidatePath("/onboarding/schedule");
  redirect("/onboarding/schedule");
}

/**
 * RESCHEDULE APPOINTMENT
 * Security:
 * - only the owner (cookie sub) can reschedule their appointment (or admin)
 */
export async function rescheduleAppointment(formData: FormData): Promise<void> {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  const role = auth?.role ?? "unknown";
  if (!sub) throw new Error("Unauthorized. Please sign in again.");

  const apptId = clean(formData.get("appointmentId"), 200);
  const scheduledAtIso = clean(formData.get("scheduledAt"), 100);

  if (!apptId || !scheduledAtIso) {
    console.error("Missing reschedule data", { apptId, scheduledAtIso });
    return;
  }

  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) {
    console.error("Invalid reschedule datetime", scheduledAtIso);
    return;
  }

  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, apptId))
    .limit(1);

  if (!appt) {
    console.error("Appointment not found for reschedule", { apptId });
    return;
  }

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, (appt as any).userId))
    .limit(1);

  if (!userRow) {
    console.error("rescheduleAppointment: user not found for appt", { apptId });
    return;
  }

  // ✅ authorization: owner or admin
  if (role !== "admin" && (userRow as any).cognitoSub !== sub) {
    throw new Error("Forbidden.");
  }

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

  const durationMinutes = ((appt as any).durationMinutes ?? 30) as number;
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60000);

  if (email) {
    await sendAppointmentEmail({
      to: email,
      kind: "RESCHEDULED",
      appointmentId: apptId,
      startsAt: scheduledAt,
      endsAt,
    });
  }

  if (phone) {
    await sendSms(phone, `Your SW Tax Service appointment was rescheduled to ${fmtLocal(scheduledAt)}.`);
  }

  revalidatePath("/onboarding/schedule");
  redirect("/onboarding/schedule");
}
