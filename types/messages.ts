// /types/messages.ts
import type { AppRole } from "@/lib/auth/types";

// Conversations/messages can be sent by real users (AppRole) OR the system.
export type SenderRole = AppRole | "SYSTEM";

export type Conversation = {
  id: string;
  subject?: string | null;
  updatedAt: string | Date;

  // ✅ allow SYSTEM now that you added it to the DB enum
  lastSenderRole?: SenderRole | null;

  clientUnread?: number;
  adminUnread?: number;
};
