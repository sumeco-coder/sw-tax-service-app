// app/(client)/(protected)/onboarding/schedule/page.tsx
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { appointments, users } from "@/drizzle/schema";
import { and, eq, gte, asc } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";
import ScheduleClient from "./_components/ScheduleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OnboardingSchedulePage() {
  const auth = await getServerRole();
  if (!auth?.sub) redirect("/sign-in");

  const sub = String(auth.sub).trim();

  const [u] = await db
    .select({
      id: users.id,
      email: users.email,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  // If user shell doesn't exist yet, still render client (client/actions can create it)
  if (!u?.id) {
    return (
      <ScheduleClient
        userEmail={(auth.email ?? "").trim()}
        userPhone=""
        appointment={null}
      />
    );
  }

  const now = new Date();

  const [appt] = await db
    .select({
      id: appointments.id,
      scheduledAt: appointments.scheduledAt,
      durationMinutes: appointments.durationMinutes,
      status: appointments.status,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, u.id),
        eq(appointments.status, "scheduled"), // ⚠️ must match your DB enum exactly
        gte(appointments.scheduledAt, now) // ✅ only upcoming
      )
    )
    .orderBy(asc(appointments.scheduledAt)) // ✅ soonest upcoming
    .limit(1);

  return (
    <ScheduleClient
      userEmail={(u.email ?? auth.email ?? "").trim()}
      userPhone={(u.phone ?? "").trim()}
      appointment={
        appt
          ? {
              id: appt.id,
              scheduledAt: (appt.scheduledAt as unknown as Date).toISOString(), // ✅ string
              durationMinutes: appt.durationMinutes ?? 30,
            }
          : null
      }
    />
  );
}
