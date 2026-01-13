// app/checkout/page.tsx
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

function CheckoutInner() {
  const sp = useSearchParams();
  const [msg, setMsg] = useState("Redirecting to checkout…");
  const started = useRef(false);

  const product = sp.get("product") ?? "";

  // decode email since it may come in URL-encoded
  const emailRaw = sp.get("email") ?? "";
  const email = (() => {
    try {
      return decodeURIComponent(emailRaw).trim();
    } catch {
      return emailRaw.trim();
    }
  })();

  const cognitoSub = sp.get("cognitoSub") ?? "";

  useEffect(() => {
    // Prevent double-run in dev/StrictMode
    if (started.current) return;
    started.current = true;

    if (!product || !email) {
      setMsg("Missing product or email in the checkout link.");
      return;
    }

    (async () => {
      setMsg("Creating secure checkout session…");

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ product, email, cognitoSub }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Checkout failed (${res.status})`);
      }

      if (!data?.url) {
        throw new Error("No Stripe checkout URL returned.");
      }

      setMsg("Redirecting to Stripe…");
      window.location.assign(data.url);
    })().catch((e: unknown) => {
      console.error("Checkout error:", e);
      const message =
        e instanceof Error ? e.message : "Something went wrong starting checkout.";
      setMsg(message);
    });
  }, [product, email, cognitoSub]);

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">{msg}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Please wait…</p>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg p-8">
          <h1 className="text-xl font-semibold">Redirecting to checkout…</h1>
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}
