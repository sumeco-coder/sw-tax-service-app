// app/(admin)/admin/(protected)/analytics/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminAnalyticsPage() {
  const src = process.env.NEXT_PUBLIC_LOOKER_STUDIO_EMBED_URL;

  if (!src) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <h1 className="text-xl font-semibold text-[#202030]">Analytics</h1>
        <p className="mt-2 text-sm text-[#202030]/70">
          Missing{" "}
          <code className="rounded bg-black/5 px-1">
            NEXT_PUBLIC_LOOKER_STUDIO_EMBED_URL
          </code>
          . Add it in Amplify env vars.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#202030]">Analytics</h1>
        <p className="mt-1 text-sm text-[#202030]/70">
          GA4 report embedded via Looker Studio.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <iframe
          src={src}
          className="h-[820px] w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
}
