// app/lib/unsubscribe.ts
import crypto from "crypto";

type UnsubPayload = {
  email: string;
  exp: number; // epoch ms
};

function getSecret() {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    // Fail loud in server logs, but don’t crash random token checks elsewhere
    throw new Error("UNSUBSCRIBE_SECRET is not set");
  }
  return secret;
}

function hmac(body: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

function safeEqual(a: string, b: string) {
  // timingSafeEqual throws if lengths differ; guard first
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function makeUnsubToken(payload: UnsubPayload) {
  const secret = getSecret();

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = hmac(body, secret);

  return `${body}.${sig}`;
}

export function verifyUnsubToken(token: string): UnsubPayload | null {
  if (!token) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  let expected: string;
  try {
    expected = hmac(body, getSecret());
  } catch {
    return null;
  }

  if (!safeEqual(sig, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("email" in payload) ||
    !("exp" in payload)
  ) {
    return null;
  }

  const email = String((payload as any).email || "").toLowerCase().trim();
  const exp = Number((payload as any).exp);

  if (!email) return null;
  if (!Number.isFinite(exp) || exp <= 0) return null;
  if (Date.now() > exp) return null;

  return { email, exp };
}
