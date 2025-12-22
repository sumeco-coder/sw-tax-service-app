// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/_components/recipients-section.tsx
import RecipientPicker from "./recipient-picker";

export default function RecipientsSection({
  campaignId,
  subscribers,
  existingEmails,
  recentRecipients,
}: {
  campaignId: string;
  subscribers: any[];
  existingEmails: string[];
  recentRecipients: any[];
}) {
  return (
    <>
      <RecipientPicker campaignId={campaignId} subscribers={subscribers} existingEmails={existingEmails} />

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#202030]">Recipients</h2>

        <div className="mt-4 overflow-hidden rounded-2xl border">
          <div className="grid grid-cols-12 bg-black/[0.02] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
            <div className="col-span-5">Email</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Sent</div>
            <div className="col-span-2">Error</div>
          </div>

          <div className="divide-y">
            {recentRecipients.map((r) => (
              <div key={r.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm">
                <div className="col-span-5 font-medium text-[#202030]">{r.email}</div>
                <div className="col-span-2">
                  <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                    {String(r.status)}
                  </span>
                </div>
                <div className="col-span-3 text-xs text-[#202030]/70">
                  {r.sentAt ? new Date(r.sentAt as any).toLocaleString() : "—"}
                </div>
                <div className="col-span-2 text-xs text-[#202030]/60">
                  {r.error ? String(r.error).slice(0, 28) : "—"}
                </div>
              </div>
            ))}

            {recentRecipients.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#202030]/60">
                No recipients yet. Build recipients or use manual picker.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
