// app/(admin)/admin/(protected)/email/logs/[recipientId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/drizzle/db";
import { emailRecipients, emailCampaigns } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LogDetailPage({
  params,
}: {
  params: { recipientId: string };
}) {
  const recipientId = params.recipientId;

  const [row] = await db
    .select({
      id: emailRecipients.id,
      email: emailRecipients.email,
      status: emailRecipients.status,
      error: emailRecipients.error,
      sentAt: emailRecipients.sentAt,
      createdAt: emailRecipients.createdAt,
      campaignId: emailRecipients.campaignId,

      renderedSubject: emailRecipients.renderedSubject,
      renderedHtml: emailRecipients.renderedHtml,
      renderedText: emailRecipients.renderedText,

      campaignName: emailCampaigns.name,
    })
    .from(emailRecipients)
    .leftJoin(emailCampaigns, eq(emailCampaigns.id, emailRecipients.campaignId))
    .where(eq(emailRecipients.id, recipientId))
    .limit(1);

  if (!row) return notFound();

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <Link href="/admin/email/logs" className="text-sm font-semibold hover:underline">
          ← Back to Logs
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-[#202030]">Recipient Log</h1>
          <span className="rounded-full border px-2 py-1 text-xs font-semibold">
            {row.status}
          </span>

          {row.campaignId ? (
            <Link
              href={`/admin/email/campaigns/${row.campaignId}`}
              className="rounded-full border bg-black/[0.02] px-2 py-1 text-xs font-semibold hover:underline"
            >
              {row.campaignName ?? "Campaign"}
            </Link>
          ) : null}
        </div>

        <p className="text-sm text-[#202030]/70">
          <span className="font-semibold">To:</span> {row.email}
          {" • "}
          <span className="font-semibold">When:</span>{" "}
          {new Date((row.sentAt ?? row.createdAt) as any).toLocaleString()}
        </p>

        {row.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <div className="font-semibold">Error</div>
            <div className="mt-1 whitespace-pre-wrap">{row.error}</div>
          </div>
        ) : null}
      </div>

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#202030]">Rendered subject</h2>
        <div className="mt-2 rounded-2xl border bg-black/[0.02] p-3 text-sm">
          {row.renderedSubject ?? "— (not saved yet)"}
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#202030]">Rendered HTML</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border">
          {row.renderedHtml ? (
            <div
              className="prose max-w-none p-4"
              dangerouslySetInnerHTML={{ __html: row.renderedHtml }}
            />
          ) : (
            <div className="p-4 text-sm text-[#202030]/60">— (not saved yet)</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#202030]">Rendered text</h2>
        <div className="mt-3 whitespace-pre-wrap rounded-2xl border bg-black/[0.02] p-4 text-sm">
          {row.renderedText ?? "— (not saved yet)"}
        </div>
      </section>
    </main>
  );
}
