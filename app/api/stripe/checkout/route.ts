import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { product, email, cognitoSub } = await req.json().catch(() => ({}));

  if (product !== "tax-plan") {
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }

  const emailLower = String(email ?? "").trim().toLowerCase();
  if (!emailLower) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const price = process.env.STRIPE_PRICE_TAX_PLAN;
  if (!price) {
    return NextResponse.json({ error: "Missing STRIPE_PRICE_TAX_PLAN" }, { status: 500 });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://swtaxservice.com";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: emailLower,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,

    metadata: {
      product: "tax-plan",
      emailLower,
      cognitoSub: String(cognitoSub ?? ""),
      source: "tax-calculator",
    },

    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel?product=tax-plan`,
  });

  return NextResponse.json({ url: session.url });
}
