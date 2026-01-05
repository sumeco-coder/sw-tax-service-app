// app/(admin)/admin/(protected)/tax-tools/unlock/actions.ts
"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";

// ✅ If you already have a server-side role check, use it here.
// Example (adjust to your project):
// import { getServerRole } from "@/lib/auth/roleServer";
async function assertAdmin() {
  // If you have a real admin check, put it here.
  // const role = await getServerRole();
  // if (role !== "admin" && role !== "superadmin") throw new Error("Unauthorized");
  return;
}

function normalizeEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

/**
 * Manually unlocks the tax plan for a user.
 * Use this after:
 * - Payment confirmation
 * - Invoice payment
 * - Admin approval
 */
export async function unlockTaxPlanByEmail(email: string) {
  await assertAdmin();

  const emailLower = normalizeEmail(email);
  if (!emailLower) throw new Error("Email is required");

  const updated = await db
    .update(users)
    .set({
      hasPaidForPlan: true,
      // updatedAt auto-updates via $onUpdate in your schema ✅
    })
    // ✅ case-insensitive match
    .where(sql`lower(${users.email}) = ${emailLower}`)
    .returning({
      id: users.id,
      email: users.email,
      hasPaidForPlan: users.hasPaidForPlan,
    });

  if (updated.length === 0) {
    throw new Error("No user found with that email");
  }

  return { success: true, user: updated[0] };
}

/**
 * Unlocks the tax plan AND marks user as a filing client.
 * Use when:
 * - Client begins onboarding
 * - Engagement letter is signed
 * - Filing service is initiated
 */
export async function unlockTaxPlanForFiling(cognitoSub: string) {
  await assertAdmin();

  const sub = String(cognitoSub ?? "").trim();
  if (!sub) throw new Error("Cognito sub is required");

  const updated = await db
    .update(users)
    .set({
      filingClient: true,
      hasPaidForPlan: true, // filing includes full access
    })
    .where(eq(users.cognitoSub, sub))
    .returning({
      id: users.id,
      email: users.email,
      filingClient: users.filingClient,
      hasPaidForPlan: users.hasPaidForPlan,
    });

  if (updated.length === 0) {
    throw new Error("No user found with that Cognito account");
  }

  return { success: true, user: updated[0] };
}
