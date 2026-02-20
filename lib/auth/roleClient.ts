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
  groups: string[];
  rawRole: string | null;
};

const APP_ROLES: readonly AppRole[] = [
  "TAXPAYER",
  "AGENCY",
  "ADMIN",
  "SUPERADMIN",
  "LMS_PREPARER",
  "LMS_ADMIN",
  "TAX_PREPARER",
  "SUPPORT_AGENT",
] as const;

function normalizeRole(v: unknown) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
}

function isAppRole(v: string): v is AppRole {
  return APP_ROLES.includes(v as AppRole);
}

function getGroups(payload: Record<string, any>): string[] {
  const g = payload["cognito:groups"];
  return Array.isArray(g) ? g.map((s) => String(s)) : [];
}

function resolveRole(customRoleRaw: unknown, groups: string[]): AppRole {
  const roleNorm = normalizeRole(customRoleRaw);
  if (isAppRole(roleNorm)) return roleNorm;

  const g = groups.map((x) => normalizeRole(x));
  if (g.includes("SUPERADMIN")) return "SUPERADMIN";
  if (g.includes("ADMIN")) return "ADMIN";
  if (g.includes("SUPPORT_AGENT")) return "SUPPORT_AGENT";
  if (g.includes("LMS_ADMIN")) return "LMS_ADMIN";
  if (g.includes("LMS_PREPARER")) return "LMS_PREPARER";
  if (g.includes("TAX_PREPARER")) return "TAX_PREPARER";
  if (g.includes("AGENCY")) return "AGENCY";
  return "TAXPAYER";
}

export async function getClientRole(): Promise<RoleInfo | null> {
  try {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken;
    if (!idToken) return null;

    const payload = idToken.payload as Record<string, any>;
    const groups = getGroups(payload);

    const rawRole = (payload["custom:role"] as string | undefined) ?? null;
    const role = resolveRole(rawRole, groups);

    const email =
      (payload["email"] as string | undefined) ??
      (payload["username"] as string | undefined) ??
      null;

    return { role, email, groups, rawRole };
  } catch (err) {
    console.error("getClientRole error:", err);
    return null;
  }
}
