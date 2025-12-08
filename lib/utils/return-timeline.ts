import { RETURN_TIMELINE_STAGES } from "@/lib/constants/return-timeline";
import type { ReturnStatus } from "@/types/dashboard";

export function getTimelineStageIndex(status: ReturnStatus["status"]): number {
  if (status === "AMENDED") {
    return RETURN_TIMELINE_STAGES.length - 1;
  }

  const idx = RETURN_TIMELINE_STAGES.findIndex((stage) =>
    stage.matches.includes(status)
  );

  if (idx === -1) {
    return 0; // fallback for DRAFT
  }

  return idx;
}
