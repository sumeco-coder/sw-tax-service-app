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

  // Upsert: if email exists, update + resubscribe
  await db
    .insert(emailSubscribers)
    .values({
      email,
      fullName: fullName || null,
      tags: tags || null,
      status: "subscribed",
      source: "manual",
    })
    // drizzle supports onConflictDoUpdate in Postgres
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

export async function unsubscribeSubscriber(id: string) {
  await db
    .update(emailSubscribers)
    .set({ status: "unsubscribed", updatedAt: new Date() })
    .where(eq(emailSubscribers.id, id));

  revalidatePath("/admin/email/list");
}

export async function resubscribeSubscriber(id: string) {
  await db
    .update(emailSubscribers)
    .set({ status: "subscribed", updatedAt: new Date() })
    .where(eq(emailSubscribers.id, id));

  revalidatePath("/admin/email/list");
}

export async function deleteSubscriber(id: string) {
  await db.delete(emailSubscribers).where(eq(emailSubscribers.id, id));
  revalidatePath("/admin/email/list");
}
