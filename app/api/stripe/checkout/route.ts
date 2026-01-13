// app/api/stripe/checkout/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
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
      return NextResponse.json(
        { error: "Missing STRIPE_PRICE_TAX_PLAN" },
        { status: 500 }
      );
    }

    // Make this match your real domain
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://www.swtaxservice.com";

    const stripe = getStripe();

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
