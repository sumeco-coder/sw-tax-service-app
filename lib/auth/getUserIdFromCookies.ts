import { cookies } from "next/headers";
import { decodeJwt } from "jose";

export async function getUserIdFromCookies() {
  const c = await cookies();

  const token =
    c.get("accessToken")?.value ||
    c.get("idToken")?.value;

  if (!token) return null;

  const payload = decodeJwt(token);
  return typeof payload.sub === "string" ? payload.sub : null;
}
