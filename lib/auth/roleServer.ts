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
function resolveRole(
  customRoleRaw: unknown,
  groups: string[]
): AppRole {
  // 1️⃣ Prefer explicit custom role
  if (isAppRole(customRoleRaw)) {
    return customRoleRaw;
  }

  // 2️⃣ Map Cognito groups → AppRole
  if (groups.includes("superadmin")) return "SUPERADMIN";
  if (groups.includes("admin")) return "ADMIN";
  if (groups.includes("support-agent")) return "SUPPORT_AGENT";
  if (groups.includes("lms-admin")) return "LMS_ADMIN";
  if (groups.includes("lms-preparer")) return "LMS_PREPARER";
  if (groups.includes("tax-preparer")) return "TAX_PREPARER";
  if (groups.includes("agency")) return "AGENCY";
  if (groups.includes("taxpayer")) return "TAXPAYER";

  // 3️⃣ Safe default
  return "TAXPAYER";
}

export async function getServerRole(): Promise<ServerRoleInfo | null> {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("accessToken")?.value;
  const idToken = cookieStore.get("idToken")?.value;

   const payload =
    (idToken && (await verifyAndDecode(idToken))) ||
    (idToken && decodeJwtPayload(idToken)) ||
    (accessToken && decodeJwtPayload(accessToken));

  if (!payload) return null;


  const groups: string[] =
    (payload["cognito:groups"] as string[] | undefined) ?? [];

  const customRoleRaw = payload["custom:role"];
  const role = resolveRole(customRoleRaw, groups);

  const email =
    normalizeEmail(payload["email"]) ??
    normalizeEmail(payload["username"]) ??
    normalizeEmail(payload["cognito:username"]);

  const sub =
    (typeof payload["sub"] === "string" && payload["sub"]) || null;

  return {
    role,     // ✅ ALWAYS UPPERCASE AppRole
    email,
    groups,
    payload,
    sub,
  };
}
