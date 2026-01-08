"use server";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { requireAdminOrRedirect, revalidateClientPaths } from "../_helpers";

export async function adminUpdateClientProfile(
  userId: string,
  patch: {
    name?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    filingStatus?: string;
  }
) {
  await requireAdminOrRedirect();

  await db
    .update(users)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidateClientPaths(userId);
  return { ok: true };
}
