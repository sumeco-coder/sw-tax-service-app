"use server";

import { db } from "@/drizzle/db";
import { clientBusinesses } from "@/drizzle/schema";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function s(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

function asIntOrNull(v: string) {
  const n = Number(v);
  return Number.isFinite(n) && n > 1900 && n < 3000 ? Math.trunc(n) : null;
}

function path(userId: string) {
  return `/admin/clients/${userId}/business`;
}

function sameYearWhere(taxYear: number | null) {
  return taxYear === null ? isNull(clientBusinesses.taxYear) : eq(clientBusinesses.taxYear, taxYear);
}

async function enforceSinglePrimary(userId: string, keepId: string, taxYear: number | null) {
  await db
    .update(clientBusinesses)
    .set({ isPrimary: false, updatedAt: new Date() } as any)
    .where(
      and(
        eq(clientBusinesses.userId, userId),
        ne(clientBusinesses.id, keepId),
        sameYearWhere(taxYear),
        eq(clientBusinesses.isPrimary, true)
      )
    );
}

export async function addBusiness(userId: string, fd: FormData) {
  const businessName = s(fd.get("businessName"));
  if (!businessName) throw new Error("Business name is required.");

  const taxYear = asIntOrNull(s(fd.get("taxYear")));
  const isActive = fd.get("isActive") === "on";
  const isPrimary = fd.get("isPrimary") === "on";

  const [created] = await db
    .insert(clientBusinesses)
    .values({
      userId,
      businessName,
      ein: s(fd.get("ein")) || null,
      entityType: (s(fd.get("entityType")) || "SOLE_PROP") as any,

      taxYear,
      isActive,
      isPrimary,

      industry: s(fd.get("industry")) || null,
      naicsCode: s(fd.get("naicsCode")) || null,
      businessStartDate: s(fd.get("businessStartDate")) || null,
      businessAddress: s(fd.get("businessAddress")) || null,
      has1099Income: fd.get("has1099Income") === "on",
      notes: s(fd.get("notes")) || null,
      updatedAt: new Date(),
    } as any)
    .returning({ id: clientBusinesses.id });

  if (isPrimary && created?.id) {
    await enforceSinglePrimary(userId, created.id, taxYear);
  }

  revalidatePath(path(userId));
}

export async function updateBusiness(userId: string, id: string, fd: FormData) {
  const businessName = s(fd.get("businessName"));
  if (!businessName) throw new Error("Business name is required.");

  const taxYear = asIntOrNull(s(fd.get("taxYear")));
  const isActive = fd.get("isActive") === "on";
  const isPrimary = fd.get("isPrimary") === "on";

  await db
    .update(clientBusinesses)
    .set({
      businessName,
      ein: s(fd.get("ein")) || null,
      entityType: (s(fd.get("entityType")) || "SOLE_PROP") as any,

      taxYear,
      isActive,
      isPrimary,

      industry: s(fd.get("industry")) || null,
      naicsCode: s(fd.get("naicsCode")) || null,
      businessStartDate: s(fd.get("businessStartDate")) || null,
      businessAddress: s(fd.get("businessAddress")) || null,
      has1099Income: fd.get("has1099Income") === "on",
      notes: s(fd.get("notes")) || null,
      updatedAt: new Date(),
    } as any)
    .where(and(eq(clientBusinesses.id, id), eq(clientBusinesses.userId, userId)));

  if (isPrimary) {
    await enforceSinglePrimary(userId, id, taxYear);
  }

  revalidatePath(path(userId));
}

export async function deleteBusiness(userId: string, id: string) {
  await db
    .delete(clientBusinesses)
    .where(and(eq(clientBusinesses.id, id), eq(clientBusinesses.userId, userId)));

  revalidatePath(path(userId));
}

export async function listBusinesses(userId: string) {
  return db
    .select()
    .from(clientBusinesses)
    .where(eq(clientBusinesses.userId, userId))
    .orderBy(desc(clientBusinesses.createdAt));
}
