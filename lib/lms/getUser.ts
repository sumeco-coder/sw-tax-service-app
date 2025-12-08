// lib/lms/getUser.ts
import { cookies } from "next/headers";

type LmsUser = {
  id: string;                // Cognito sub
  email: string;
  firmId: string | null;
  role: string | null;
  agencyId: string | null;
  raw: any;
};

/**
 * Reads the JWT accessToken from cookies and extracts LMS-related claims.
 * This avoids using Amplify server helpers and works with your existing
 * sign-in flow that sets `accessToken` as a cookie.
 */
export async function getLmsUser(): Promise<LmsUser | null> {
  const cookieStore = await cookies();

  // 👇 same cookie name you use in lib/authServer.ts
  const token = cookieStore.get("accessToken")?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString();
    const payload = JSON.parse(payloadJson);

    const sub = payload?.sub as string | undefined;
    if (!sub) return null;

    return {
      id: sub,
      email: (payload.email as string) ?? "",
      firmId: (payload["custom:firmId"] as string) ?? null,
      role: (payload["custom:role"] as string) ?? null,
      agencyId: (payload["custom:agencyId"] as string) ?? null,
      raw: payload,
    };
  } catch {
    return null;
  }
}
