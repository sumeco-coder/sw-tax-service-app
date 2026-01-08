// app/(admin)/admin/(protected)/templates/page.tsx
import Link from "next/link";
import { listEmailTemplates, renderEmailTemplate } from "./actions";
import { EMAIL_DEFAULTS } from "@/lib/constants/email-defaults";

type PageProps = {
  searchParams?: { t?: string };
};

export default async function EmailTemplatesPage({ searchParams }: PageProps) {
  const templates = await listEmailTemplates();
  const selectedId = searchParams?.t ?? templates[0]?.id ?? "waitlist/01-prelaunch";

  const previewVars = {
  ...EMAIL_DEFAULTS,
  first_name: "there",
  portal_link: "https://www.swtaxservice.com/",
  due_date: "January 15, 2026",
  missing_item_1: "W-2 from your employer",
  missing_item_2: "1099-G (unemployment)",
  missing_item_3: "Photo ID (front/back)",
  accepted_by: "IRS",
  reject_reason: "AGI mismatch from prior year",
  client_action: "Confirm your prior-year AGI (or upload last year return)",
};


  const rendered = await renderEmailTemplate(selectedId, previewVars);

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <aside className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Email Templates</h1>
          <Link href="/admin/email" className="text-sm text-gray-600 hover:underline">
            Back
          </Link>
        </div>

        <div className="space-y-2">
          {templates.map((t: typeof templates[number]) => {
            const active = t.id === selectedId;
            return (
              <Link
                key={t.id}
                href={`/admin/email/templates?t=${encodeURIComponent(t.id)}`}
                className={[
                  "block rounded-lg border px-3 py-2 text-sm",
                  active ? "border-black bg-gray-50" : "border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-gray-600">{t.category ?? "general"}</div>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-dashed p-3 text-xs text-gray-600">
          <div className="font-semibold text-gray-800">Preview vars</div>
          <div>first_name = “there”</div>
          <div>waitlist_link = {EMAIL_DEFAULTS.waitlist_link}</div>
        </div>
      </aside>

      <section className="rounded-xl border bg-white p-4">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Subject</div>
          <div className="mt-1 rounded-lg border bg-gray-50 p-3 text-sm font-medium">
            {rendered.subject}
          </div>
        </div>

        <div className="mb-6">
  <div className="text-xs uppercase tracking-wide text-muted-foreground">
    HTML Preview
  </div>

  <div className="mt-2 rounded-2xl border bg-muted/30 p-4">
    <div className="mx-auto max-w-[820px] overflow-hidden rounded-2xl border bg-background shadow-sm">
      <iframe
        title="Email preview"
        className="block w-full"
        style={{ height: 820 }}
        srcDoc={rendered.html}
      />
    </div>
  </div>
</div>


        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Text Version</div>
          <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-gray-50 p-4 text-sm">
            {rendered.text}
          </pre>
        </div>
      </section>
    </div>
  );
}
