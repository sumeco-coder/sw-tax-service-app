"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CheckoutSuccessInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState("Confirming payment…");

  useEffect(() => {
    const sessionId = sp.get("session_id");
    if (!sessionId) {
      setMsg("Missing session_id.");
      return;
    }

    (async () => {
      const res = await fetch(
        `/api/stripe/confirm?session_id=${encodeURIComponent(sessionId)}`
      );
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg("Could not confirm payment. If you were charged, it will unlock shortly.");
        return;
      }

      // ✅ send them back and resume the calculator state
      router.replace("/tax-calculator?resume=1&unlocked=1");
    })();
  }, [router, sp]);

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">{msg}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        If this takes longer than a few seconds, refresh your results page.
      </p>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg p-8">
          <h1 className="text-xl font-semibold">Confirming payment…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Loading checkout confirmation…
          </p>
        </main>
      }
    >
      <CheckoutSuccessInner />
    </Suspense>
  );
}
