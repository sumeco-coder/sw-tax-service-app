// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/_components/campaign-header.tsx
import Link from "next/link";
import { StatusPill, SegmentLabel } from "./ui";

export default function CampaignHeader({ campaign }: { campaign: any }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <Link
          href="/admin/email/campaigns"
          className="text-sm font-semibold text-[#202030] hover:underline"
        >
          ← Back to Campaigns
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <h1 className="text-2xl font-bold text-[#202030]">{campaign.name}</h1>
          <StatusPill status={String(campaign.status)} />
          <SegmentLabel seg={String(campaign.segment)} />
        </div>

        <p className="text-sm text-[#202030]/70">
          <span className="font-semibold text-[#202030]">Subject:</span>{" "}
          {campaign.subject}
        </p>

        {campaign.scheduledAt ? (
          <p className="text-xs text-[#202030]/70">
            <span className="font-semibold text-[#202030]">Scheduled:</span>{" "}
            {new Date(campaign.scheduledAt as any).toLocaleString()}
            {campaign.schedulerName ? (
              <span className="ml-2 text-[#202030]/50">
                ({String(campaign.schedulerName)})
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {/* ✅ no send button here anymore */}
      <div />
    </div>
  );
}
