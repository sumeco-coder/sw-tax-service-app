"use server";

import { z } from "zod";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { requireAdminOrRedirect, revalidateClientPaths } from "./_helpers";

const StatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["active", "disabled"]),
  reason: z.string().max(500).optional(),
});

export async function setClientStatus(formData: FormData) {
  await requireAdminOrRedirect();

  const parsed = StatusSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    status: String(formData.get("status") ?? ""),
    reason: String(formData.get("reason") ?? "").trim() || undefined,
  });
  if (!parsed.success) return;

  const { userId, status, reason } = parsed.data;

  await db
    .update(users)
    .set({
      status,
      disabledAt: status === "disabled" ? new Date() : null,
      disabledReason: status === "disabled" ? (reason ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidateClientPaths(userId);
}

const ProfileSchema = z.object({
  userId: z.string().min(1),
  name: z.string().max(120).optional(),
  adminNotes: z.string().max(2000).optional(),
});

export async function updateClientProfile(formData: FormData) {
  await requireAdminOrRedirect();

  const parsed = ProfileSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    name: String(formData.get("name") ?? "").trim() || undefined,
    adminNotes: String(formData.get("adminNotes") ?? "").trim() || undefined,
  });
  if (!parsed.success) return;

  const { userId, name, adminNotes } = parsed.data;

  await db
    .update(users)
    .set({
      name: name ?? null,
      adminNotes: adminNotes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidateClientPaths(userId);
}
