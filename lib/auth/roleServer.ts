// lib/auth/roleServer.ts
import { cookies } from "next/headers";
import type { AppRole } from "./roleClient";

export type ServerRoleInfo = {
  role: AppRole;
  email: string | null;
  groups: string[];
  payload: Record<string, any>;
  sub: string | null;
};

function decodeJwtPayload(token: string): Record<string, any> | null {
  const part = token.split(".")[1];
  if (!part) return null;

  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function normalizeEmail(v: unknown): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  return s ? s : null;
}

const APP_ROLES: AppRole[] = [
  "taxpayer",
  "lms-preparer",
  "lms-admin",
  "admin",
  "unknown",
];

function isAppRole(v: unknown): v is AppRole {
  return typeof v === "string" && APP_ROLES.includes(v as AppRole);
}

export async function getServerRole(): Promise<ServerRoleInfo | null> {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("accessToken")?.value;
  const idToken = cookieStore.get("idToken")?.value;

  // prefer idToken payload; fallback to accessToken payload
  const payload =
    (idToken && decodeJwtPayload(idToken)) ||
    (accessToken && decodeJwtPayload(accessToken));

  if (!payload) return null;

  const groups: string[] = (payload["cognito:groups"] as string[] | undefined) ?? [];
  const customRoleRaw = payload["custom:role"];

  const role: AppRole =
    (isAppRole(customRoleRaw) && customRoleRaw) ||
    (groups.includes("admin")
      ? "admin"
      : groups.includes("lms-admin")
      ? "lms-admin"
      : groups.includes("lms-preparer")
      ? "lms-preparer"
      : groups.includes("taxpayer")
      ? "taxpayer"
      : "unknown");

  const email =
    normalizeEmail(payload["email"]) ??
    normalizeEmail(payload["username"]) ??
    normalizeEmail(payload["cognito:username"]);

  const sub = (typeof payload["sub"] === "string" && payload["sub"]) || null;

  return { role, email, groups, payload, sub };
}
