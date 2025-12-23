// lib/authServer.ts
// ❗ UI-only — NOT for authorization

import { cookies } from "next/headers";
import { db } from "@/drizzle/client-core";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Lightweight helper to show user info in layouts,
 * NOT for authorization.
 */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) return null;

  const payloadPart = token.split(".")[1];
  if (!payloadPart) return null;

  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString());
  } catch {
    return null;
  }

  const sub = payload?.sub;
  if (!sub) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.cognitoSub, sub))
    .limit(1);

  return {
    id: user?.id ?? null,
    sub,
    email: user?.email ?? payload.email ?? "",
    name: user?.name ?? payload.name ?? "",
  };
}
