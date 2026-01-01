// app/(admin)/admin/(protected)/clients/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

function assertAdminOrRedirect(auth: any) {
  const isAdmin =
    auth?.role === "ADMIN" || auth?.role === "LMS_ADMIN" || auth?.role === "LMS_PREPARER";
  if (!auth) redirect("/admin/sign-in");
  if (!isAdmin) redirect("/admin");
}

const StatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["active", "disabled"]),
  reason: z.string().max(500).optional(),
});

export async function setClientStatus(formData: FormData) {
  const auth = await getServerRole();
  assertAdminOrRedirect(auth);

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
    })
    .where(eq(users.id, userId));

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${userId}`);
}

const ProfileSchema = z.object({
  userId: z.string().min(1),
  name: z.string().max(120).optional(),
  adminNotes: z.string().max(2000).optional(),
});

export async function updateClientProfile(formData: FormData) {
  const auth = await getServerRole();
  assertAdminOrRedirect(auth);

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
    })
    .where(eq(users.id, userId));

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${userId}`);
}
