// app/(site)/subscribe/page.tsx
import { SubscribeSection } from "./_components/subscribers/SubscribeSection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SubscribePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
            Subscribe
          </h1>
          <p className="mt-2 text-muted-foreground">
            Get tax tips, IRS updates, and offers. Unsubscribe anytime.
          </p>
        </div>

        <SubscribeSection />
      </div>
    </main>
  );
}
