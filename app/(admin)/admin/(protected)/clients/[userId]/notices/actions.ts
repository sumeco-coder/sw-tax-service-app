"use server";

import { db } from "@/drizzle/db";
import { clientNotices } from "@/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function s(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

function noticesPath(userId: string) {
  return `/admin/clients/${userId}/notices`;
}

export async function addNotice(userId: string, fd: FormData) {
  await db.insert(clientNotices).values({
    userId,
    agency: (s(fd.get("agency")) || "IRS") as any,
    noticeNumber: s(fd.get("noticeNumber")) || null,
    taxYear: s(fd.get("taxYear")) ? Number(s(fd.get("taxYear"))) : null,
    receivedDate: s(fd.get("receivedDate")) || null,
    dueDate: s(fd.get("dueDate")) || null,
    status: (s(fd.get("status")) || "OPEN") as any,
    summary: s(fd.get("summary")) || null,
    resolutionNotes: s(fd.get("resolutionNotes")) || null,
    updatedAt: new Date(),
  } as any);

  revalidatePath(noticesPath(userId));
}

export async function updateNotice(userId: string, id: string, fd: FormData) {
  await db
    .update(clientNotices)
    .set({
      agency: (s(fd.get("agency")) || "IRS") as any,
      noticeNumber: s(fd.get("noticeNumber")) || null,
      taxYear: s(fd.get("taxYear")) ? Number(s(fd.get("taxYear"))) : null,
      receivedDate: s(fd.get("receivedDate")) || null,
      dueDate: s(fd.get("dueDate")) || null,
      status: (s(fd.get("status")) || "OPEN") as any,
      summary: s(fd.get("summary")) || null,
      resolutionNotes: s(fd.get("resolutionNotes")) || null,
      updatedAt: new Date(),
    } as any)
    .where(and(eq(clientNotices.id, id), eq(clientNotices.userId, userId)));

  revalidatePath(noticesPath(userId));
}

export async function deleteNotice(userId: string, id: string) {
  await db
    .delete(clientNotices)
    .where(and(eq(clientNotices.id, id), eq(clientNotices.userId, userId)));

  revalidatePath(noticesPath(userId));
}

export async function listNotices(userId: string) {
  return db
    .select()
    .from(clientNotices)
    .where(eq(clientNotices.userId, userId))
    .orderBy(desc(clientNotices.createdAt));
}
