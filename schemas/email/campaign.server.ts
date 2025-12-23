// schemas/email/campaign.server.ts
import "server-only";

import { z } from "zod";
import { emailCampaignSegment, emailCampaignStatus } from "@/drizzle/schema";

export const SegmentSchema = z.enum(emailCampaignSegment.enumValues);
export const StatusSchema = z.enum(emailCampaignStatus.enumValues);

export const CreateCampaignSchema = z.object({
  name: z.string().trim().min(2, "Campaign name is required."),
  subject: z.string().trim().min(2, "Subject is required."),
  htmlBody: z.string().trim().min(5, "HTML body is required."),
  textBody: z.string().trim().optional(),
  segment: SegmentSchema.optional(),
});

export const UpdateCampaignSchema = z.object({
  id: z.string().trim().min(1, "Campaign id is required."),
  name: z.string().trim().min(2).optional(),
  subject: z.string().trim().min(2).optional(),
  htmlBody: z.string().trim().min(5).optional(),
  textBody: z.string().trim().optional(),
  segment: SegmentSchema.optional(),
});

export const SetCampaignStatusSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
  status: StatusSchema,
});

export const DuplicateCampaignSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
});

export const DeleteCampaignSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
});

export const ApplyTemplateSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
  templateId: z.string().trim().min(1, "Template id is required."),
  waitlist_link: z.string().trim().optional(),
});

export const BuildRecipientsSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
  limit: z.coerce.number().int().min(1).max(50000).default(5000),
});

export const ScheduleCampaignDbSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign id is required."),
  scheduledAtIso: z.string().trim().min(1, "scheduledAt is required."),
});
