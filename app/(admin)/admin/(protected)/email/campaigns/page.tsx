// app/(admin)/admin/(protected)/email/campaigns/page.tsx
import Link from "next/link";
import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { desc } from "drizzle-orm";
import { createCampaign } from "./actions";

// ✅ templates live under protected/email/templates/_templates
import { ALL_TEMPLATES } from "../templates/_templates";
import NewCampaignForm from "./_components/new-campaign-form";

// ✅ your shared defaults (single source of truth)
import { EMAIL_DEFAULT_VARS } from "@/lib/email/defaultVars";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PickerTemplate = {
  id: string;
  name: string;
  category?: string;
  subject: string;
  html: string; // compiled html (or direct html)
  text: string;
};

async function buildPickerTemplates(): Promise<PickerTemplate[]> {
  // Try to support MJML templates too (if mjml is installed)
  let mjml2html: any = null;
  try {
    const mod: any = await import("mjml");
    mjml2html = mod?.default ?? mod;
  } catch {
    // mjml not installed — MJML templates will just have empty html
    mjml2html = null;
  }

  return ALL_TEMPLATES.map((t: any) => {
    const htmlFromTemplate =
      typeof t.html === "string" && t.html.trim() ? t.html.trim() : "";

    const mjmlFromTemplate =
      typeof t.mjml === "string" && t.mjml.trim() ? t.mjml.trim() : "";

    let html = htmlFromTemplate;

    // If no html but has mjml and compiler available, compile to html
    if (!html && mjmlFromTemplate && mjml2html) {
      try {
        const out = mjml2html(mjmlFromTemplate, { validationLevel: "soft" });
        html = String(out?.html ?? "").trim();
      } catch {
        html = "";
      }
    }

    return {
      id: String(t.id),
      name: String(t.name),
      category: t.category ? String(t.category) : undefined,
      subject: String(t.subject ?? ""),
      html,
      text: String(t.text ?? ""),
    };
  });
}

export default async function CampaignsPage() {
  const campaigns = await db
    .select({
      id: emailCampaigns.id,
      name: emailCampaigns.name,
      subject: emailCampaigns.subject,
      status: emailCampaigns.status,
      segment: emailCampaigns.segment,
      createdAt: emailCampaigns.createdAt,
      sentAt: emailCampaigns.sentAt,
    })
    .from(emailCampaigns)
    .orderBy(desc(emailCampaigns.createdAt))
    .limit(50);

  const templates = await buildPickerTemplates();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#202030]">Campaigns</h1>
          <p className="text-sm text-[#202030]/70">
            Create campaigns, select recipients, and send bulk emails.
          </p>
        </div>

        <Link
          href="/admin/email"
          className="rounded-2xl border px-3 py-2 text-sm font-semibold hover:bg-black/5"
        >
          Back to Email →
        </Link>
      </div>

      {/* Create campaign */}
      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#202030]">New campaign</h2>

        <NewCampaignForm
          action={createCampaign}
          templates={templates}
          defaults={EMAIL_DEFAULT_VARS}
        />
      </section>

      {/* List campaigns */}
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="grid grid-cols-12 bg-black/[0.02] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#202030]/60">
          <div className="col-span-4">Campaign</div>
          <div className="col-span-4">Subject</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Segment</div>
        </div>

        <div className="divide-y">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/admin/email/campaigns/${c.id}`}
              className="grid grid-cols-12 items-center px-5 py-3 text-sm hover:bg-black/[0.02]"
            >
              <div className="col-span-4 font-medium text-[#202030]">
                {c.name}
                <div className="text-xs text-[#202030]/60">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(
                    c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt as any)
                  )}
                </div>
              </div>

              <div className="col-span-4 text-[#202030]/80">{c.subject}</div>

              <div className="col-span-2">
                <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                  {c.status}
                </span>
              </div>

              <div className="col-span-2 text-xs text-[#202030]/70">{c.segment}</div>
            </Link>
          ))}

          {campaigns.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#202030]/60">
              No campaigns yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
