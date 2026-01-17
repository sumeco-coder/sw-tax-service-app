// app/(site)/analytics/page.tsx

export const dynamic = "force-dynamic";

export default function ClientAnalyticsPage() {
  const src = process.env.LOOKER_STUDIO_CLIENT_EMBED_URL;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-6">
      {/* Branding header */}
      <div className="rounded-3xl border bg-gradient-to-r from-[#E62A68] to-[#BB4E2B] p-6 text-white shadow-sm">
        <h1 className="text-2xl font-semibold">
          Your Website Performance
        </h1>
        <p className="mt-1 text-sm opacity-90">
          A high-level overview of your site’s activity and growth.
        </p>
      </div>

      {/* Analytics */}
      <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <iframe
          src={src}
          className="min-h-[70vh] w-full"
          loading="lazy"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups"
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
}
