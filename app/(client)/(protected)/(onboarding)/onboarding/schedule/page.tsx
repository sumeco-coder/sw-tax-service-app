// app/(client)/(protected)/onboarding/schedule/page.tsx
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { appointments, users } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";
import ScheduleClient from "./_components/ScheduleClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OnboardingSchedulePage() {
  const auth = await getServerRole();
  if (!auth?.sub) redirect("/sign-in");

  const sub = String(auth.sub);

  const [u] = await db
    .select({
      id: users.id,
      email: users.email,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  if (!u?.id) {
    // user shell might not exist yet; let client still render
    return <ScheduleClient userEmail={auth.email ?? ""} userPhone={""} appointment={null} />;
  }

  const [appt] = await db
    .select({
      id: appointments.id,
      scheduledAt: appointments.scheduledAt,
      durationMinutes: appointments.durationMinutes,
      status: appointments.status,
    })
    .from(appointments)
    .where(and(eq(appointments.userId, u.id), eq(appointments.status, "scheduled")))
    .limit(1);

  return (
    <ScheduleClient
      userEmail={u.email ?? auth.email ?? ""}
      userPhone={u.phone ?? ""}
      appointment={
        appt
          ? {
              id: appt.id,
              scheduledAt: appt.scheduledAt as unknown as Date,
              durationMinutes: appt.durationMinutes ?? 30,
            }
          : null
      }
    />
  );
}
