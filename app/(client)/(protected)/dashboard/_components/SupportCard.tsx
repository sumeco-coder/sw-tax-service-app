"use client";

import { useRouter } from "next/navigation";

export default function SupportCard({
  year,
  scrollToMessages,
}: {
  year: number;
  scrollToMessages: () => void;
}) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Support &amp; Help
      </h3>

      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Have questions or need assistance with your tax return? We&apos;re
          here to help.
        </p>

        {/* Primary actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={scrollToMessages}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg 
                       bg-[linear-gradient(90deg,#f00067,#4a0055)] px-3 py-2 
                       text-xs font-medium text-white shadow-sm shadow-pink-500/30 
                       hover:brightness-110 transition"
          >
            💬 Message SW Tax
          </button>

          <button
            onClick={() => router.push(`/onboarding/schedule?year=${year}`)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg 
                       border border-border bg-background px-3 py-2 
                       text-xs font-medium text-foreground hover:bg-muted transition"
          >
            📞 Book a call
          </button>
        </div>

        {/* FAQ Section */}
        <div className="pt-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase">
            Frequently Asked Questions
          </div>
          <ul className="mt-2 space-y-1 text-xs text-primary">
            <li>
              <button
                onClick={() => router.push("/help/documents")}
                className="hover:underline"
              >
                What documents do I need?
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push("/help/refund")}
                className="hover:underline"
              >
                How do I check my IRS refund?
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push("/help/upload")}
                className="hover:underline"
              >
                How do I upload documents from my phone?
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
