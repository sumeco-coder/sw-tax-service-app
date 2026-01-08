import { headers } from "next/headers";

function normalizeBaseUrl(raw: unknown) {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  s = s.replace(/\/+$/, "");
  return s;
}

export async function getOriginServer() {
  try {
    const h = await headers(); // Next 15
    const host = (h.get("x-forwarded-host") || h.get("host") || "").trim();
    if (host) {
      const protoRaw = (h.get("x-forwarded-proto") || "").trim();
      const proto = protoRaw || (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // ignore
  }

  return (
    normalizeBaseUrl(process.env.APP_ORIGIN) ||
    normalizeBaseUrl(process.env.SITE_URL) ||
    "http://localhost:3000"
  );
}

export function buildInviteLinks(origin: string, token: string) {
  const invite_link = `${origin}/taxpayer/onboarding-sign-up?invite=${encodeURIComponent(token)}`;
  const sign_in_link = `${origin}/sign-in?invite=${encodeURIComponent(token)}&next=${encodeURIComponent(
    "/onboarding/profile"
  )}`;
  return { invite_link, sign_in_link };
}
