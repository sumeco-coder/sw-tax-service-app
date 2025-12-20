// app/(admin)/admin/(protected)/email/list/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { emailSubscribers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const AddSubscriberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  fullName: z.string().trim().optional(),
  tags: z.string().trim().optional(), // comma-separated
});

const IdSchema = z.object({
  id: z.string().uuid("Invalid id."),
});

export async function addSubscriber(formData: FormData) {
  const parsed = AddSubscriberSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    tags: formData.get("tags"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { email, fullName, tags } = parsed.data;

  await db
    .insert(emailSubscribers)
    .values({
      email,
      fullName: fullName || null,
      tags: tags || null,
      status: "subscribed",
      source: "manual",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: emailSubscribers.email,
      set: {
        fullName: fullName || null,
        tags: tags || null,
        status: "subscribed",
        updatedAt: new Date(),
      },
    });

  revalidatePath("/admin/email/list");
}

export async function unsubscribeSubscriber(formData: FormData) {
  const parsed = IdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid id.");

  await db
    .update(emailSubscribers)
    .set({ status: "unsubscribed", updatedAt: new Date() })
    .where(eq(emailSubscribers.id, parsed.data.id));

  revalidatePath("/admin/email/list");
}

export async function resubscribeSubscriber(formData: FormData) {
  const parsed = IdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid id.");

  await db
    .update(emailSubscribers)
    .set({ status: "subscribed", updatedAt: new Date() })
    .where(eq(emailSubscribers.id, parsed.data.id));

  revalidatePath("/admin/email/list");
}

export async function deleteSubscriber(formData: FormData) {
  const parsed = IdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid id.");

  await db.delete(emailSubscribers).where(eq(emailSubscribers.id, parsed.data.id));
  revalidatePath("/admin/email/list");
}
