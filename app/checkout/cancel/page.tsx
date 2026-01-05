"use client";

import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Checkout canceled</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No worries — you can unlock anytime.
      </p>

      <Link href="/tax-calculator?resume=1" className="btn-primary mt-6 inline-flex">
        Return to results
      </Link>
    </main>
  );
}
