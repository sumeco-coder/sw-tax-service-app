"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function CheckoutInner() {
  const sp = useSearchParams();
  const [msg, setMsg] = useState("Redirecting to checkout…");

  useEffect(() => {
    // whatever you do today with search params
    const plan = sp.get("plan");
    const resume = sp.get("resume");
    // example: call your API to create a Stripe session
    // setMsg(...) etc

    // keep your existing logic here
  }, [sp]);

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">{msg}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Please wait…
      </p>
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
