// lib/auth/roleServer.ts
import { cookies } from "next/headers";
import type { AppRole } from "./roleClient";
import { CognitoJwtVerifier } from "aws-jwt-verify";


export type ServerRoleInfo = {
  role: AppRole;
  email: string | null;
  groups: string[];
  payload: Record<string, any>;
  sub: string | null;
};

interface CognitoJwtPayload {
  sub?: string;
  email?: string;
  username?: string;
  "cognito:username"?: string;
  "cognito:groups"?: string[];
  "custom:role"?: string;
  "custom:agencyId"?: string;
  exp?: number;
  [k: string]: any;
}

const verifier =
  process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID
    ? CognitoJwtVerifier.create({
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        tokenUse: "id",
        clientId: process.env.COGNITO_CLIENT_ID,
      })
    : null;

async function verifyAndDecode(token: string): Promise<CognitoJwtPayload | null> {
  try {
    if (!verifier) return null;
    const payload = await verifier.verify(token);
    return payload as CognitoJwtPayload;
  } catch {
    return null;
  }
}

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

function norm(s: unknown) {
  return String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
}
/* ─────────────────────────────────────────────
   App roles (MUST match DB enum exactly)
───────────────────────────────────────────── */
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

function isAppRole(v: unknown): v is AppRole {
  return typeof v === "string" && APP_ROLES.includes(v as AppRole);
}

/* ─────────────────────────────────────────────
   Resolve role (UPPERCASE ONLY)
───────────────────────────────────────────── */
function resolveRole(customRoleRaw: unknown, groupsRaw: string[]): AppRole {
  const custom = norm(customRoleRaw);
  if (isAppRole(custom)) return custom;

  const groups = (groupsRaw ?? []).map(norm);

  if (groups.includes("SUPERADMIN")) return "SUPERADMIN";
  if (groups.includes("ADMIN")) return "ADMIN";
  if (groups.includes("SUPPORT_AGENT")) return "SUPPORT_AGENT";
  if (groups.includes("LMS_ADMIN")) return "LMS_ADMIN";
  if (groups.includes("LMS_PREPARER")) return "LMS_PREPARER";
  if (groups.includes("TAX_PREPARER")) return "TAX_PREPARER";
  if (groups.includes("AGENCY")) return "AGENCY";
  if (groups.includes("TAXPAYER")) return "TAXPAYER";

  return "TAXPAYER";
}

export async function getServerRole(): Promise<ServerRoleInfo | null> {
  try {
    const cookieStore = await cookies(); // ✅ keep await (matches your types)

    const accessToken = cookieStore.get("accessToken")?.value;
    const idToken = cookieStore.get("idToken")?.value;

    const payload =
      (idToken && (await verifyAndDecode(idToken))) ||
      (idToken && decodeJwtPayload(idToken)) ||
      (accessToken && decodeJwtPayload(accessToken));

    if (!payload) return null;

    const groups: string[] =
      (payload["cognito:groups"] as string[] | undefined) ?? [];

    const role = resolveRole(payload["custom:role"], groups);

    const email =
      normalizeEmail(payload["email"]) ??
      normalizeEmail(payload["username"]) ??
      normalizeEmail(payload["cognito:username"]);

    const sub = (typeof payload["sub"] === "string" && payload["sub"]) || null;

    return {
      role,
      email,
      groups,
      payload,
      sub,
    };
  } catch {
    return null;
  }
}


