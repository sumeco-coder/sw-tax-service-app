// app/(admin)/admin/(protected)/_components/AnalyticsPanel.tsx
import Link from "next/link";
import { clarityOverviewLast7Days } from "@/lib/analytics/clarity";

export default async function AnalyticsPanel() {
  const src = process.env.LOOKER_STUDIO_EMBED_URL;

  // Clarity is optional — we’ll keep it safe if token not set yet
  let clarity = { sessions: 0, rageClicks: 0, deadClicks: 0 };
  try {
    clarity = await clarityOverviewLast7Days();
  } catch {}

  return (
    <section className="rounded-3xl border bg-black/[0.02] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#202030]">Analytics</h2>
          <p className="text-sm text-[#202030]/70">
            GA4 via Looker Studio + Clarity (last 7 days)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/analytics"
            className="rounded-2xl border bg-white px-3 py-2 text-sm font-semibold text-[#202030] hover:bg-black/5"
          >
            Full analytics →
          </Link>
          <Link
            href="https://analytics.google.com/"
            target="_blank"
            className="rounded-2xl border bg-white px-3 py-2 text-sm font-semibold text-[#202030] hover:bg-black/5"
          >
            Open GA4 →
          </Link>
          <Link
            href="https://clarity.microsoft.com/"
            target="_blank"
            className="rounded-2xl border bg-white px-3 py-2 text-sm font-semibold text-[#202030] hover:bg-black/5"
          >
            Open Clarity →
          </Link>
        </div>
      </div>

      {/* Clarity cards */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <MetricCard label="Clarity Sessions" value={clarity.sessions} sub="Last 7 days" />
        <MetricCard label="Rage Clicks" value={clarity.rageClicks} sub="Last 7 days" />
        <MetricCard label="Dead Clicks" value={clarity.deadClicks} sub="Last 7 days" />
      </div>

      {/* GA4 embed */}
      <div className="mt-4 overflow-hidden rounded-3xl border bg-white shadow-sm">
        {src ? (
          <iframe
            src={src}
            className="h-[520px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            style={{ border: 0 }}
          />
        ) : (
          <div className="p-6">
            <p className="text-sm font-semibold text-[#202030]">GA4 Report</p>
            <p className="mt-1 text-sm text-[#202030]/70">
              Add{" "}
              <code className="rounded bg-black/5 px-1">
                LOOKER_STUDIO_EMBED_URL
              </code>{" "}
              in Amplify env vars to show the report here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-sm font-semibold text-[#202030]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#202030]">{value}</p>
      <p className="mt-1 text-sm text-[#202030]/60">{sub}</p>
    </div>
  );
}
