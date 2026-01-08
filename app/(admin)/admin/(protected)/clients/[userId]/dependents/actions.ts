"use server";

import { db } from "@/drizzle/db";
import { dependents } from "@/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function asString(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

function asInt(v: FormDataEntryValue | null, fallback: number) {
  const n = Number(typeof v === "string" ? v : "");
  return Number.isFinite(n) ? n : fallback;
}

function asBool(v: FormDataEntryValue | null) {
  // checkbox returns "on" when checked
  return v === "on" || v === "true" || v === "1";
}

function dependentsPath(userId: string) {
  return `/admin/clients/${userId}/dependents`;
}

export async function addDependent(userId: string, formData: FormData) {
  const firstName = asString(formData.get("firstName"));
  const middleName = asString(formData.get("middleName")); // allowed blank
  const lastName = asString(formData.get("lastName"));
  const dob = asString(formData.get("dob")); // YYYY-MM-DD from <input type="date" />
  const relationship = asString(formData.get("relationship"));
  const monthsInHome = asInt(formData.get("monthsInHome"), 12);

  const appliedButNotReceived = asBool(formData.get("appliedButNotReceived"));
  const isStudent = asBool(formData.get("isStudent"));
  const isDisabled = asBool(formData.get("isDisabled"));

  if (!firstName || !lastName || !dob || !relationship) {
    throw new Error("Missing required fields (first, last, DOB, relationship).");
  }

  if (monthsInHome < 0 || monthsInHome > 12) {
    throw new Error("Months in home must be between 0 and 12.");
  }

  await db.insert(dependents).values({
    userId,
    firstName,
    middleName, // your schema defaults "", but we can still set it
    lastName,
    dob,
    relationship, // stored as text in your schema
    monthsInHome,
    appliedButNotReceived,
    isStudent,
    isDisabled,
    updatedAt: new Date(),
  } as any);

  revalidatePath(dependentsPath(userId));
}

export async function updateDependent(
  userId: string,
  dependentId: string,
  formData: FormData
) {
  const firstName = asString(formData.get("firstName"));
  const middleName = asString(formData.get("middleName"));
  const lastName = asString(formData.get("lastName"));
  const dob = asString(formData.get("dob"));
  const relationship = asString(formData.get("relationship"));
  const monthsInHome = asInt(formData.get("monthsInHome"), 12);

  const appliedButNotReceived = asBool(formData.get("appliedButNotReceived"));
  const isStudent = asBool(formData.get("isStudent"));
  const isDisabled = asBool(formData.get("isDisabled"));

  if (!firstName || !lastName || !dob || !relationship) {
    throw new Error("Missing required fields (first, last, DOB, relationship).");
  }

  if (monthsInHome < 0 || monthsInHome > 12) {
    throw new Error("Months in home must be between 0 and 12.");
  }

  // ✅ ensure the dependent belongs to this userId
  await db
    .update(dependents)
    .set({
      firstName,
      middleName,
      lastName,
      dob,
      relationship,
      monthsInHome,
      appliedButNotReceived,
      isStudent,
      isDisabled,
      updatedAt: new Date(),
    } as any)
    .where(and(eq(dependents.id, dependentId), eq(dependents.userId, userId)));

  revalidatePath(dependentsPath(userId));
}

export async function deleteDependent(userId: string, dependentId: string) {
  // ✅ ensure the dependent belongs to this userId
  await db
    .delete(dependents)
    .where(and(eq(dependents.id, dependentId), eq(dependents.userId, userId)));

  revalidatePath(dependentsPath(userId));
}

export async function listDependents(userId: string) {
  return db
    .select()
    .from(dependents)
    .where(eq(dependents.userId, userId))
    .orderBy(desc(dependents.createdAt));
}
