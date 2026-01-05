// app/(admin)/admin/(protected)/clients/[userId]/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export async function adminUpdateClientProfile(userId: string, patch: {
  name?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  filingStatus?: string;
}) {
  const auth = await getServerRole();
  if (!auth) throw new Error("Unauthorized");

  const isAdmin =
    auth.role === "ADMIN" ||
    auth.role === "LMS_ADMIN" ||
    auth.role === "LMS_PREPARER";

  if (!isAdmin) throw new Error("Forbidden");

  await db.update(users).set({
    ...patch,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));

  return { ok: true };
}
