"use server";

import { z } from "zod";
import { db } from "@/drizzle/db";
import { emailSubscribers, emailUnsubscribes } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

type State = { ok: boolean; message: string };

const SubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  fullName: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length ? v : undefined)),
});

export async function subscribeToNewsletter(prev: State, formData: FormData): Promise<State> {
  const parsed = SubscribeSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, fullName } = parsed.data;

  try {
    // If they previously unsubscribed, treat submit as a resubscribe:
    await db.delete(emailUnsubscribes).where(eq(emailUnsubscribes.email, email));

    await db
      .insert(emailSubscribers)
      .values({
        email,
        fullName: fullName ?? null,
        tags: null,
        status: "subscribed",
        source: "site",
      })
      .onConflictDoUpdate({
        target: emailSubscribers.email,
        set: {
          fullName: fullName ?? null,
          status: "subscribed",
          source: "site",
          updatedAt: new Date(),
        },
      });

    return { ok: true, message: "You’re subscribed ✅" };
  } catch (err: any) {
    console.error("subscribe error:", err);
    return { ok: false, message: "Something went wrong. Try again." };
  }
}
