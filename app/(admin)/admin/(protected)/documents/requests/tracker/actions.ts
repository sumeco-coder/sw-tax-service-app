// app/(admin)/admin/(protected)/documents/requests/tracker/actions.ts
"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { documentRequests, users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

const ADMIN_ROLES = new Set(["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"]);

function clean(v: unknown, max = 2000) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}

async function requireAdmin() {
  const auth = await getServerRole();
  if (!auth?.sub) redirect("/admin/sign-in");

  const role = String(auth.role ?? "").toUpperCase();
  if (!ADMIN_ROLES.has(role)) redirect("/admin");

  const sub = String(auth.sub);

  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  return { staffUserId: u ? String(u.id) : null };
}

export async function adminMarkRequestCompletedFromForm(formData: FormData) {
  await requireAdmin();

  const requestId = clean(formData.get("requestId"));
  const returnTo = clean(formData.get("returnTo")) || "/admin/documents/requests/tracker";
  if (!requestId) redirect(returnTo);

  await db
    .update(documentRequests)
    .set({
      status: "completed" as any,
      completedAt: new Date(),
      cancelledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(documentRequests.id, requestId as any));

  redirect(returnTo);
}

export async function adminCancelRequestFromForm(formData: FormData) {
  await requireAdmin();

  const requestId = clean(formData.get("requestId"));
  const returnTo = clean(formData.get("returnTo")) || "/admin/documents/requests/tracker";
  if (!requestId) redirect(returnTo);

  await db
    .update(documentRequests)
    .set({
      status: "cancelled" as any,
      cancelledAt: new Date(),
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(documentRequests.id, requestId as any));

  redirect(returnTo);
}

export async function adminBumpReminderFromForm(formData: FormData) {
  await requireAdmin();

  const requestId = clean(formData.get("requestId"));
  const returnTo = clean(formData.get("returnTo")) || "/admin/documents/requests/tracker";
  if (!requestId) redirect(returnTo);

  await db
    .update(documentRequests)
    .set({
      reminderCount: (documentRequests.reminderCount as any) + 1,
      lastRemindedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(documentRequests.id, requestId as any));

  redirect(returnTo);
}
