// app/(admin)/admin/(protected)/clients/[userId]/documents/requests/actions.ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users, documentRequests, documentRequestItems } from "@/drizzle/schema";
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

function normalizeDocTypeKey(label: string) {
  const s = label.toLowerCase();
  if (s.startsWith("w-2")) return "W2";
  if (s.startsWith("1099")) return "1099";
  if (s.includes("photo id")) return "ID";
  if (s.includes("last-year")) return "PRIOR_RETURN";
  if (s.includes("ssa-1099")) return "SSA1099";
  return null;
}

export async function getClientBasics(userId: string) {
  await requireAdmin();

  const [u] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      cognitoSub: users.cognitoSub,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!u) throw new Error("Client not found.");
  return u;
}

export async function getRequestWithItems(userId: string, requestId: string) {
  await requireAdmin();

  const [req] = await db
    .select({
      id: documentRequests.id,
      userId: documentRequests.userId,
      dueDate: documentRequests.dueDate,
      note: documentRequests.note,
      status: documentRequests.status,
      createdAt: documentRequests.createdAt,
    })
    .from(documentRequests)
    .where(and(eq(documentRequests.id, requestId as any), eq(documentRequests.userId, userId as any)))
    .limit(1);

  if (!req) return null;

  const items = await db
    .select({
      id: documentRequestItems.id,
      label: documentRequestItems.label,
      status: documentRequestItems.status,
      sortOrder: documentRequestItems.sortOrder,
    })
    .from(documentRequestItems)
    .where(eq(documentRequestItems.requestId, requestId as any))
    .orderBy(documentRequestItems.sortOrder);

  return { req, items };
}

export async function adminCreateDocumentRequestFromForm(userId: string, formData: FormData) {
  const { staffUserId } = await requireAdmin();

  const items = formData
    .getAll("items")
    .map((v) => String(v).trim())
    .filter(Boolean);

  const due = clean(formData.get("due"), 40);
  const note = clean(formData.get("note"), 500);

  const [req] = await db
    .insert(documentRequests)
    .values({
      userId,
      createdBy: staffUserId,
      dueDate: due ? new Date(due) : null,
      note: note || null,
      status: "open" as any,
      reminderCount: 0,
      lastRemindedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .returning({ id: documentRequests.id });

  const requestId = String(req.id);

  if (items.length) {
    await db.insert(documentRequestItems).values(
      items.map((label, i) => ({
        requestId,
        label,
        docTypeKey: normalizeDocTypeKey(label),
        sortOrder: i,
        required: true,
        status: "requested" as any,
        createdAt: new Date(),
      })) as any,
    );
  }

  redirect(`/admin/clients/${userId}/documents/requests?requestId=${encodeURIComponent(requestId)}`);
}

export async function adminUpdateDocumentRequestFromForm(userId: string, requestId: string, formData: FormData) {
  const { staffUserId } = await requireAdmin();

  const items = formData
    .getAll("items")
    .map((v) => String(v).trim())
    .filter(Boolean);

  const due = clean(formData.get("due"), 40);
  const note = clean(formData.get("note"), 500);

  // verify ownership (request belongs to that user)
  const [req] = await db
    .select({ id: documentRequests.id })
    .from(documentRequests)
    .where(and(eq(documentRequests.id, requestId as any), eq(documentRequests.userId, userId as any)))
    .limit(1);

  if (!req) redirect(`/admin/clients/${userId}/documents/requests`);

  await db
    .update(documentRequests)
    .set({
      dueDate: due ? new Date(due) : null,
      note: note || null,
      updatedAt: new Date(),
      createdBy: staffUserId ?? null, // optional (audit)
    } as any)
    .where(eq(documentRequests.id, requestId as any));

  // replace items (simple + reliable)
  await db.delete(documentRequestItems).where(eq(documentRequestItems.requestId, requestId as any));

  if (items.length) {
    await db.insert(documentRequestItems).values(
      items.map((label, i) => ({
        requestId,
        label,
        docTypeKey: normalizeDocTypeKey(label),
        sortOrder: i,
        required: true,
        status: "requested" as any,
        createdAt: new Date(),
      })) as any,
    );
  }

  redirect(`/admin/clients/${userId}/documents/requests?requestId=${encodeURIComponent(requestId)}`);
}

const PreviewSchema = z.object({
  requestId: z.string().optional().default(""),
  items: z.array(z.string()).default([]),
  due: z.string().optional().default(""),
  note: z.string().optional().default(""),
});

export async function redirectToRequestPreview(userId: string, formData: FormData) {
  await requireAdmin();

  const requestId = clean(formData.get("requestId"), 64);
  const items = formData.getAll("items").map((v) => String(v));
  const due = clean(formData.get("due"), 40);
  const note = clean(formData.get("note"), 500);

  const parsed = PreviewSchema.safeParse({ requestId, items, due, note });
  const data = parsed.success ? parsed.data : { requestId, items, due, note };

  const params = new URLSearchParams();
  if (data.requestId) params.set("requestId", data.requestId);
  if (data.items.length) params.set("items", data.items.join(","));
  if (data.due) params.set("due", data.due);
  if (data.note) params.set("note", data.note);

  const qs = params.toString();
  redirect(qs ? `/admin/clients/${userId}/documents/requests?${qs}` : `/admin/clients/${userId}/documents/requests`);
}
