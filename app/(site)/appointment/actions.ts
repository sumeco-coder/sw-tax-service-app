"use server";

import { z } from "zod";
import { db } from "@/drizzle/db";
import { appointmentRequests } from "@/drizzle/schema";
import { sendAppointmentEmail } from "@/lib/email/appointments";
import { sendSms } from "@/lib/sms/sns";

export type AppointmentState = { ok: boolean; message: string };

const RequestInput = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().toLowerCase().email("Valid email required"),
  phone: z.string().trim().optional(),
  scheduledAt: z.string().trim(),
});

export async function requestAppointment(
  _prevState: AppointmentState,
  formData: FormData
): Promise<AppointmentState> {
  const parsed = RequestInput.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: (formData.get("phone") as string | null) ?? undefined,
    scheduledAt: formData.get("scheduledAt"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid form" };
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, message: "Invalid date/time selected." };
  }

  await db.insert(appointmentRequests).values({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    scheduledAt,
  });

  await sendAppointmentEmail({
    to: parsed.data.email,
    kind: "BOOKED",
    startsAt: scheduledAt,
    endsAt: new Date(scheduledAt.getTime() + 30 * 60000),
  });

  if (parsed.data.phone) {
    await sendSms(
      parsed.data.phone,
      `Your SW Tax Service appointment request is set for ${scheduledAt.toLocaleString()}.`
    );
  }

  return { ok: true, message: "Booked! Check your email for confirmation." };
}
