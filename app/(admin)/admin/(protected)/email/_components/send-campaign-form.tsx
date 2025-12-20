"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";

type TemplateItem = {
  id: string;
  name: string;
  category?: string;
  subject: string;
  html: string;
  text: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
    >
      {pending ? "Sending…" : "Send campaign"}
    </button>
  );
}

export default function SendCampaignForm({
  templates,
  action,
}: {
  templates: TemplateItem[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [templateId, setTemplateId] = React.useState<string>("");
  const selected = React.useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId]
  );

  const [subject, setSubject] = React.useState("");
  const [htmlBody, setHtmlBody] = React.useState("");
  const [textBody, setTextBody] = React.useState("");

  function loadTemplate() {
    if (!selected) return;
    setSubject(selected.subject ?? "");
    setHtmlBody((selected.html ?? "").trim());
    setTextBody((selected.text ?? "").trim());
  }

  return (
    <form action={action} className="mt-4 grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-gray-600">
          Campaign name
          <input
            name="name"
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Waitlist Open Announcement"
            defaultValue=""
          />
        </label>

        <label className="grid gap-1 text-xs text-gray-600">
          Segment
          <select name="segment" className="rounded-lg border px-3 py-2 text-sm" defaultValue="waitlist_pending">
            <option value="waitlist_pending">Waitlist: Pending</option>
            <option value="waitlist_approved">Waitlist: Approved</option>
            <option value="waitlist_all">Waitlist: All</option>
          </select>
        </label>
      </div>

      <label className="grid gap-1 text-xs text-gray-600">
        Limit (avoid timeouts)
        <input
          name="limit"
          defaultValue={200}
          className="rounded-lg border px-3 py-2 text-sm"
          inputMode="numeric"
        />
      </label>

      {/* TEMPLATE PICKER */}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1 text-xs text-gray-600">
          Template
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">— Select a template —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.category ? `${t.category} · ` : ""}
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={loadTemplate}
          disabled={!selected}
          className="h-[38px] self-end rounded-lg border px-3 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        >
          Load template
        </button>
      </div>

      <label className="grid gap-1 text-xs text-gray-600">
        Subject
        <input
          name="subject"
          required
          className="rounded-lg border px-3 py-2 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </label>

      <label className="grid gap-1 text-xs text-gray-600">
        HTML Body
        <textarea
          name="htmlBody"
          required
          rows={10}
          className="rounded-lg border px-3 py-2 text-sm font-mono"
          value={htmlBody}
          onChange={(e) => setHtmlBody(e.target.value)}
          placeholder={`Include tokens like {{company_name}} and end with {{footer_html}}`}
        />
      </label>

      <label className="grid gap-1 text-xs text-gray-600">
        Text Body
        <textarea
          name="textBody"
          required
          rows={8}
          className="rounded-lg border px-3 py-2 text-sm font-mono"
          value={textBody}
          onChange={(e) => setTextBody(e.target.value)}
          placeholder={`Include tokens like {{company_name}} and end with {{footer_text}}`}
        />
      </label>

      <SubmitButton />
    </form>
  );
}
