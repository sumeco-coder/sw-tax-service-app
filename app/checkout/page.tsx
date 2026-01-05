"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CheckoutPage() {
  const sp = useSearchParams();
  const [err, setErr] = useState("");

  useEffect(() => {
    const product = sp.get("product") ?? "tax-plan";
    const email = sp.get("email") ?? "";

    (async () => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, email }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        setErr(data?.error || "Could not start checkout.");
        return;
      }

      window.location.href = data.url;
    })();
  }, [sp]);

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Redirecting to checkout…</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Please don’t close this tab.
      </p>
      {err ? <p className="mt-4 text-sm text-destructive">{err}</p> : null}
    </main>
  );
}
