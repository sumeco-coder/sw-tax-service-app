// lib/auth/roleClient.ts
"use client";

import { fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";

configureAmplify();

export type AppRole =
  | "TAXPAYER"
  | "AGENCY"
  | "ADMIN"
  | "SUPERADMIN"
  | "LMS_PREPARER"
  | "LMS_ADMIN"
  | "TAX_PREPARER"
  | "SUPPORT_AGENT";


export type RoleInfo = {
  role: AppRole;
  email: string | null;
};

export async function getClientRole(): Promise<RoleInfo | null> {
  try {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken;

    if (!idToken) return null;

    const payload = idToken.payload as Record<string, any>;

    // 🔑 Main source of truth
    const customRole = payload["custom:role"] as string | undefined;

    const role: AppRole =
      (customRole as AppRole) ??
      "unknown";

    const email =
      (payload["email"] as string | undefined) ??
      (payload["username"] as string | undefined) ??
      null;

    return { role, email };
  } catch (err) {
    console.error("getClientRole error:", err);
    return null;
  }
}
