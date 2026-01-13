"use server";

import { db } from "@/drizzle/db";
import { appointments, users } from "@/drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
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
  return dt.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
}

function isStaff(role: unknown) {
  // your roles are UPPERCASE from roleServer
  return role === "ADMIN" || role === "SUPERADMIN" || role === "SUPPORT_AGENT";
}

/**
 * ✅ Get user by cognitoSub or create them.
 * IMPORTANT: users.email is NOT NULL, so we REQUIRE email on first insert.
 */
async function getOrCreateUserBySubOrThrow(sub: string, emailFromAuth?: string | null) {
  const cognitoSub = String(sub).trim();

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub))
    .limit(1);

  if (existing) return existing;

  const email = normalizeEmail(emailFromAuth ?? "");
  if (!email) throw new Error("Missing email. Please sign in again.");

  const [created] = await db
    .insert(users)
    .values({
      cognitoSub,
      email,
      onboardingStep: "SCHEDULE" as any,
      updatedAt: new Date(),
    } as any)
    .returning();

  if (!created) throw new Error("User record could not be created.");
  return created;
}

/**
 * ✅ SKIP SCHEDULING
 * Move them forward without an appointment.
 */
export async function skipScheduling(): Promise<void> {
  const auth = await getServerRole();
  if (!auth?.sub) return redirect("/sign-in");

  const userRow = await getOrCreateUserBySubOrThrow(String(auth.sub), auth.email);

  await db
    .update(users)
    .set({
      onboardingStep: "SUMMARY" as any,
      updatedAt: new Date(),
    })
    .where(eq(users.id, (userRow as any).id));

  revalidatePath("/onboarding");
  revalidatePath("/onboarding/schedule");
  revalidatePath("/onboarding/summary");

  redirect("/onboarding/summary");
}

/**
 * BOOK APPOINTMENT (optional)
 * Expects: scheduledAt (ISO string)
 */
export async function bookAppointment(formData: FormData): Promise<void> {
  const auth = await getServerRole();
  if (!auth || !auth.sub) throw new Error("Unauthorized. Please sign in again.");

  const sub = auth.sub.trim();

  const scheduledAtIso = clean(formData.get("scheduledAt"), 100);
  if (!scheduledAtIso) throw new Error("Please select an appointment time.");

  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Invalid appointment time. Please try again.");
  }

  // prevent past bookings
  const now = new Date();
  if (scheduledAt.getTime() < now.getTime() - 60_000) {
    throw new Error("That time is in the past. Please choose a new time.");
  }

  const userRow = await getOrCreateUserBySubOrThrow(sub, auth.email);

  const emailFromForm = normalizeEmail(formData.get("email"));
  const phoneFromForm = clean(formData.get("phone"), 40);

  const email = normalizeEmail(auth.email ?? "") || emailFromForm || (userRow as any).email || "";
  const phone = phoneFromForm || (userRow as any).phone || "";

  const DEFAULT_DURATION_MINUTES = 30;

  // ✅ If they already have a scheduled appt, update it (don’t insert duplicates)
  const [existingAppt] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, (userRow as any).id),
        eq(appointments.status, "scheduled") // ✅ matches enum
      )
    )
    .orderBy(desc(appointments.scheduledAt))
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
        status: "scheduled", // ✅ matches enum
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
        userId: (userRow as any).id,
        scheduledAt,
        durationMinutes: DEFAULT_DURATION_MINUTES,
        status: "scheduled", // ✅ matches enum
        notes: null,
        cancelledReason: null,
        cancelledAt: null,
      } as any)
      .returning({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
      });

    if (!appt?.id) throw new Error("Could not book appointment. Please try again.");

    appointmentId = appt.id;
    finalStartsAt = appt.scheduledAt as Date;
    durationMinutes = appt.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  }

  // ✅ Do NOT set DONE here (you still go to SUMMARY next)
  await db
    .update(users)
    .set({
      onboardingStep: "SUMMARY" as any,
      updatedAt: new Date(),
    })
    .where(eq(users.id, (userRow as any).id));

  const endsAt = new Date(finalStartsAt.getTime() + durationMinutes * 60000);

  if (email) {
    await sendAppointmentEmail({
      to: email,
      kind: existingAppt ? "RESCHEDULED" : "BOOKED",
      appointmentId,
      startsAt: finalStartsAt,
      endsAt,
    });
  }

  if (phone) {
    const text = existingAppt
      ? `Your SW Tax Service appointment was rescheduled to ${fmtLocal(finalStartsAt)}.`
      : `Your SW Tax Service appointment is booked for ${fmtLocal(finalStartsAt)}.`;

    await sendSms(phone, text);
  }

  revalidatePath("/onboarding");
  revalidatePath("/onboarding/schedule");
  revalidatePath("/onboarding/summary");

  redirect("/onboarding/summary");
}

/**
 * CANCEL APPOINTMENT
 */
export async function cancelAppointment(formData: FormData): Promise<void> {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  const role = auth?.role;
  if (!sub) throw new Error("Unauthorized. Please sign in again.");

  const apptId = clean(formData.get("appointmentId"), 200);
  const reason =
    clean(formData.get("reason"), 300) || "Client cancelled from onboarding portal";

  if (!apptId) throw new Error("Missing appointment id.");

  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, apptId))
    .limit(1);

  if (!appt) throw new Error("Appointment not found.");

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, (appt as any).userId))
    .limit(1);

  if (!userRow) throw new Error("User not found for this appointment.");

  // ✅ owner or staff
  if (!isStaff(role) && (userRow as any).cognitoSub !== sub) {
    throw new Error("Forbidden.");
  }

  const now = new Date();
  await db
    .update(appointments)
    .set({
      status: "cancelled", // ✅ matches enum
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
 */
export async function rescheduleAppointment(formData: FormData): Promise<void> {
  const auth = await getServerRole();
  const sub = auth?.sub ? String(auth.sub) : "";
  const role = auth?.role;
  if (!sub) throw new Error("Unauthorized. Please sign in again.");

  const apptId = clean(formData.get("appointmentId"), 200);
  const scheduledAtIso = clean(formData.get("scheduledAt"), 100);

  if (!apptId || !scheduledAtIso) throw new Error("Missing reschedule data.");

  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid date/time.");

  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, apptId))
    .limit(1);

  if (!appt) throw new Error("Appointment not found.");

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, (appt as any).userId))
    .limit(1);

  if (!userRow) throw new Error("User not found for this appointment.");

  if (!isStaff(role) && (userRow as any).cognitoSub !== sub) {
    throw new Error("Forbidden.");
  }

  const now = new Date();
  await db
    .update(appointments)
    .set({
      scheduledAt,
      status: "scheduled", // ✅ matches enum
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
