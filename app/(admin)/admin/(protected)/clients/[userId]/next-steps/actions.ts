"use server";

import { db } from "@/drizzle/db";
import { clientNextSteps } from "@/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function s(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

function stepsPath(userId: string) {
  return `/admin/clients/${userId}/next-steps`;
}

export async function addNextStep(userId: string, fd: FormData) {
  const title = s(fd.get("title"));
  if (!title) throw new Error("Title is required.");

  await db.insert(clientNextSteps).values({
    userId,
    title,
    details: s(fd.get("details")) || null,
    dueDate: s(fd.get("dueDate")) || null,
    priority: (s(fd.get("priority")) || "NORMAL") as any,
    status: "OPEN" as any,
    updatedAt: new Date(),
  } as any);

  revalidatePath(stepsPath(userId));
}

export async function updateNextStep(userId: string, id: string, fd: FormData) {
  const title = s(fd.get("title"));
  if (!title) throw new Error("Title is required.");

  await db
    .update(clientNextSteps)
    .set({
      title,
      details: s(fd.get("details")) || null,
      dueDate: s(fd.get("dueDate")) || null,
      priority: (s(fd.get("priority")) || "NORMAL") as any,
      status: (s(fd.get("status")) || "OPEN") as any,
      updatedAt: new Date(),
    } as any)
    .where(and(eq(clientNextSteps.id, id), eq(clientNextSteps.userId, userId)));

  revalidatePath(stepsPath(userId));
}

export async function markDone(userId: string, id: string) {
  await db
    .update(clientNextSteps)
    .set({ status: "DONE" as any, updatedAt: new Date() } as any)
    .where(and(eq(clientNextSteps.id, id), eq(clientNextSteps.userId, userId)));

  revalidatePath(stepsPath(userId));
}

export async function deleteNextStep(userId: string, id: string) {
  await db
    .delete(clientNextSteps)
    .where(and(eq(clientNextSteps.id, id), eq(clientNextSteps.userId, userId)));

  revalidatePath(stepsPath(userId));
}

export async function listNextSteps(userId: string) {
  return db
    .select()
    .from(clientNextSteps)
    .where(eq(clientNextSteps.userId, userId))
    .orderBy(desc(clientNextSteps.createdAt));
}
