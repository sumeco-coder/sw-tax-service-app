// app/(client)/(protected)/(onboarding)/layout.tsx
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getServerRole();
  if (!me?.sub) redirect("/sign-in");

  const role = String(me.role ?? "").toLowerCase();

  // ✅ who can access onboarding
  const allowed =
    role === "taxpayer" ||
    role === "admin" ||
    role === "superadmin";

  if (!allowed) redirect("/not-authorized");

  // ✅ If DB row exists and onboarding is already finished, push them forward
  const sub = String(me.sub);
  const [u] = await db
    .select({ onboardingStep: users.onboardingStep })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  const step = String(u?.onboardingStep ?? "");

  // If they already submitted or are done, they shouldn't be in onboarding pages anymore
  if (step === "SUBMITTED" || step === "DONE") {
    redirect("/onboarding/complete"); // or "/dashboard"
  }

  // ✅ IMPORTANT: no ClientShell here (no menus in onboarding)
  return <>{children}</>;
}
