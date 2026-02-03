"use server";

import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { documents, users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

const ADMIN_ROLES = new Set(["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"]);

function clean(v: unknown, max = 500) {
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

export async function adminMarkDocReviewedFromForm(formData: FormData) {
  const { staffUserId } = await requireAdmin();

  const docId = clean(formData.get("docId"));
  const returnTo = clean(formData.get("returnTo"), 2000) || "/admin/documents";
  if (!docId) redirect(returnTo);

  await db
    .update(documents)
    .set({
      status: "reviewed" as any,
      reviewedAt: new Date(),
      reviewedBy: staffUserId,
      attentionNote: null,
    })
    .where(eq(documents.id, docId as any));

  redirect(returnTo);
}

export async function adminMarkDocNeedsAttentionFromForm(formData: FormData) {
  const { staffUserId } = await requireAdmin();

  const docId = clean(formData.get("docId"));
  const note = clean(formData.get("note"), 500);
  const returnTo = clean(formData.get("returnTo"), 2000) || "/admin/documents";
  if (!docId) redirect(returnTo);

  await db
    .update(documents)
    .set({
      status: "needs_attention" as any,
      reviewedAt: new Date(),
      reviewedBy: staffUserId,
      attentionNote: note || null,
    })
    .where(eq(documents.id, docId as any));

  redirect(returnTo);
}

export async function adminMarkDocNewFromForm(formData: FormData) {
  const { staffUserId } = await requireAdmin();

  const docId = clean(formData.get("docId"));
  const returnTo = clean(formData.get("returnTo"), 2000) || "/admin/documents";
  if (!docId) redirect(returnTo);

  await db
    .update(documents)
    .set({
      status: "new" as any,
      reviewedAt: null,
      reviewedBy: staffUserId, // keeps audit of who changed it (optional)
      attentionNote: null,
    })
    .where(eq(documents.id, docId as any));

  redirect(returnTo);
}
