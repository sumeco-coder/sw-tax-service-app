"use server";

import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const CreateCampaignSchema = z.object({
  name: z.string().trim().min(2, "Campaign name is required."),
  subject: z.string().trim().min(2, "Subject is required."),
  htmlBody: z.string().trim().min(5, "HTML body is required."),
  textBody: z.string().trim().optional(),
  segment: z.enum(["waitlist_pending", "waitlist_approved", "waitlist_all"]).optional(),
});

export async function createCampaign(formData: FormData): Promise<void> {
  const parsed = CreateCampaignSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject"),
    htmlBody: formData.get("htmlBody"),
    textBody: formData.get("textBody"),
    segment: formData.get("segment"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { name, subject, htmlBody, textBody, segment } = parsed.data;

  const [row] = await db
    .insert(emailCampaigns)
    .values({
      name,
      subject,
      htmlBody,
      textBody: textBody || null,
      segment: segment ?? "waitlist_pending",
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: emailCampaigns.id });

  revalidatePath("/admin/email/campaigns");

  // ✅ go straight to the campaign details page so you can select recipients
  redirect(`/admin/email/campaigns/${row.id}`);
}
