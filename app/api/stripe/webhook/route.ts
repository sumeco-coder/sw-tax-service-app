import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));

  const emailClean = String(email ?? "").trim().toLowerCase();
  if (!emailClean) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const PRICE_ID = mustEnv("STRIPE_PRICE_TAX_PLAN");
  const APP_URL = mustEnv("NEXT_PUBLIC_APP_URL"); // e.g. https://swtaxservice.com

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: emailClean,
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/tax-calculator?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/tax-calculator?canceled=1`,
    metadata: {
      emailLower: emailClean,
      product: "tax-plan",
    },
  });

  return NextResponse.json({ url: session.url });
}
