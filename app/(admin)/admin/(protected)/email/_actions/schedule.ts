"use server";

import {
  scheduleCampaignInDb,
  cancelCampaignScheduleInDb,
} from "../_lib/scheduler";

export async function scheduleCampaignAction(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) throw new Error("Pick a campaign.");

  const sendAtIso = String(formData.get("sendAt") ?? "").trim();
  const sendAtLocal = String(formData.get("sendAtLocal") ?? "").trim();
  if (!sendAtIso) throw new Error("Pick a send time.");

  const sendAt = new Date(sendAtIso);
  if (Number.isNaN(sendAt.getTime())) {
    throw new Error(
      `Invalid date/time. (local="${sendAtLocal}", iso="${sendAtIso}")`
    );
  }

  if (sendAt.getTime() < Date.now() + 60_000) {
    throw new Error("Send time must be at least 1 minute in the future.");
  }

  await scheduleCampaignInDb({ campaignId, sendAt });
}

export async function cancelCampaignScheduleAction(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (!campaignId) throw new Error("Missing campaignId");

  await cancelCampaignScheduleInDb(campaignId);
}
