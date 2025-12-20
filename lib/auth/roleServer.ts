// lib/auth/roleServer.ts
import { cookies } from "next/headers";
import type { AppRole } from "./roleClient";

function decodeJwtPayload(token: string) {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString());
  } catch {
    return null;
  }
}

export async function getServerRole() {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get("accessToken")?.value;
  const idToken = cookieStore.get("idToken")?.value;

  const payload =
    (idToken && decodeJwtPayload(idToken)) ||
    (accessToken && decodeJwtPayload(accessToken));

  if (!payload) return null;

  const groups: string[] = payload["cognito:groups"] ?? [];
  const customRole = payload["custom:role"] as string | undefined;

  const role: AppRole =
    (customRole as AppRole) ??
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
    payload.email ??
    payload.username ??
    payload["cognito:username"] ??
    null;

  return { role, email, groups, payload, sub: payload.sub ?? null };
}
