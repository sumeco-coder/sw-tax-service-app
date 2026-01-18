// app/api/stripe/checkout/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

function getOrigin(req: Request) {
  // Prefer explicit site URL (best for prod)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (siteUrl) return siteUrl;

  // Fallbacks that work behind proxies/CDN (Amplify, CloudFront, etc.)
  const origin = req.headers.get("origin")?.trim().replace(/\/$/, "");
  if (origin) return origin;

  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.trim();

  if (host) return `${proto}://${host}`;

  // Last resort
  return "https://www.swtaxservice.com";
}

const PRODUCT_TO_PRICE_ENV: Record<string, string> = {
  "tax-plan": "STRIPE_PRICE_TAX_PLAN",
};

function getPriceForProduct(product: string) {
  const envKey = PRODUCT_TO_PRICE_ENV[product];
  const price = envKey ? process.env[envKey]?.trim() : undefined;

  if (!price) return { ok: false as const, envKey, reason: "missing" as const };
  if (!price.startsWith("price_"))
    return { ok: false as const, envKey, reason: "invalid" as const };

  return { ok: true as const, envKey, price };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const product = String(body?.product ?? "").trim();
    const emailLower = String(body?.email ?? "").trim().toLowerCase();
    const cognitoSub = String(body?.cognitoSub ?? "").trim();

    if (!product) {
      return NextResponse.json({ error: "Product required" }, { status: 400 });
    }

    // Only allow supported products
    if (!PRODUCT_TO_PRICE_ENV[product]) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    if (!emailLower) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const priceRes = getPriceForProduct(product);
    if (!priceRes.ok) {
      return NextResponse.json(
        {
          error:
            priceRes.reason === "missing"
              ? `Missing ${priceRes.envKey}`
              : `Invalid ${priceRes.envKey} (must start with price_)`,
        },
        { status: 500 }
      );
    }

    const origin = getOrigin(req);
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: emailLower,
      line_items: [{ price: priceRes.price, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: {
        product,
        emailLower,
        cognitoSub,
        source: "tax-calculator",
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?product=${encodeURIComponent(
        product
      )}`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe session missing url" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Stripe error" },
      { status: 500 }
    );
  }
}

/**
 * Optional live health check:
 * - Returns ONLY booleans (no secret values).
 * - Remove this GET once your env vars are confirmed on live.
 */
export async function GET(req: Request) {
  const origin = getOrigin(req);
  const price = process.env.STRIPE_PRICE_TAX_PLAN?.trim();
  const secret = process.env.STRIPE_SECRET_KEY?.trim();

  return NextResponse.json({
    ok: true,
    origin,
    env: {
      STRIPE_PRICE_TAX_PLAN_present: !!price,
      STRIPE_PRICE_TAX_PLAN_valid: !!price && price.startsWith("price_"),
      STRIPE_SECRET_KEY_present: !!secret,
      STRIPE_SECRET_KEY_valid: !!secret && secret.startsWith("sk_"),
    },
  });
}
