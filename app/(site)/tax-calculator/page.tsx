// app/(site)/tax-calculator/page.tsx
import { Suspense } from "react";
import TaxCalculatorClient from "../_components/TaxCalculatorClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function TaxCalculatorPage() {
  return (
    <Suspense
      fallback={
        <main className="relative mx-auto max-w-5xl px-4 py-12">
          <section className="mx-auto mt-10 max-w-3xl">
            <div className="rounded-2xl border bg-background/80 shadow-sm backdrop-blur">
              <div className="p-6 sm:p-8">
                <p className="text-sm text-muted-foreground">Loading tax calculator…</p>
              </div>
            </div>
          </section>
        </main>
      }
    >
      <TaxCalculatorClient />
    </Suspense>
  );
}
