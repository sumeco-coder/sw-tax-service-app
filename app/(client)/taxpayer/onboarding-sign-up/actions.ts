// app/%28client%29/taxpayer/onboarding-sign-up/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { invites, waitlist } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function completeInvite(token: string) {
  const [invite] = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);

  if (!invite) throw new Error("Invite not found");

  // 1) Mark invite as accepted
  await db
    .update(invites)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(invites.id, invite.id));

  // 2) Optional: update waitlist status to "converted"
  const waitlistId = (invite.meta as any)?.waitlistId;
  if (waitlistId) {
    await db
      .update(waitlist)
      .set({ status: "approved", updatedAt: new Date() }) // or "converted"
      .where(eq(waitlist.id, waitlistId));
  }

  // (Later we can also check that user's CognitoSub matches)
}
