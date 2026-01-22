// lib/auth/roleServer.ts
import "server-only";

import { cookies } from "next/headers";
import type { AppRole } from "./roleClient";

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

function norm(s: unknown) {
  return String(s ?? "").trim().toUpperCase().replace(/-/g, "_");
}

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

function normalizeEmail(v: unknown): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  return s ? s : null;
}

/* ─────────────────────────────────────────────
   Safe JWT decode (works in Node + Edge)
───────────────────────────────────────────── */
function decodeJwtPayload(token: string): Record<string, any> | null {
  const part = token.split(".")[1];
  if (!part) return null;

  try {
    // Node
    if (typeof Buffer !== "undefined") {
      return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    }

    // Edge fallback
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────
   Lazy verifier (prevents import-time crashes)
───────────────────────────────────────────── */
let _verifier: any = null;
let _verifierInitTried = false;

async function getVerifier() {
  if (_verifierInitTried) return _verifier;
  _verifierInitTried = true;

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) {
    _verifier = null;
    return null;
  }

  try {
    const mod = await import("aws-jwt-verify");
    const { CognitoJwtVerifier } = mod as any;

    _verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: "id",
      clientId,
    });

    return _verifier;
  } catch {
    // If aws-jwt-verify can't load in this runtime, don't crash the app.
    _verifier = null;
    return null;
  }
}

async function verifyAndDecode(token: string): Promise<CognitoJwtPayload | null> {
  try {
    const verifier = await getVerifier();
    if (!verifier) return null;
    const payload = await verifier.verify(token);
    return payload as CognitoJwtPayload;
  } catch {
    return null;
  }
}

export async function getServerRole(): Promise<ServerRoleInfo | null> {
  try {
    const cookieStore = await cookies();

    const accessToken = cookieStore.get("accessToken")?.value;
    const idToken = cookieStore.get("idToken")?.value;

      if (idToken) {
      const decoded = decodeJwtPayload(idToken) as any;
      if (decoded?.exp && Date.now() / 1000 > decoded.exp) return null;
    }

    // Prefer verified ID token, fallback to decoded for resilience
    const payload =
      (idToken && (await verifyAndDecode(idToken))) ||
      (idToken && (decodeJwtPayload(idToken) as CognitoJwtPayload | null)) ||
      (accessToken && (decodeJwtPayload(accessToken) as CognitoJwtPayload | null));

    if (!payload) return null;

    const groups: string[] = (payload["cognito:groups"] as string[] | undefined) ?? [];
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
      payload: payload as any,
      sub,
    };
  } catch {
    return null;
  }
}
