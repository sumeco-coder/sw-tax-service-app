// /types/messages.ts
import type { AppRole } from "@/lib/auth/types";

export type Conversation = {
  id: string;
  subject?: string | null;
  updatedAt: string | Date;
  lastSenderRole?: AppRole | null;
  clientUnread?: number;
  adminUnread?: number;
};
