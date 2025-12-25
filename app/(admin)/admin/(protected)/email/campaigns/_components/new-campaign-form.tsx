"use client";

import * as React from "react";
import { renderString as renderFromLib } from "@/lib/helpers/render-template";

type TemplateItem = {
  id: string;
  name: string;
  category?: string;
  subject: string;
  html: string;
  text: string;
};

type Defaults = Record<string, string | number>;
type Vars = Record<string, string | number | null | undefined>;

export default function NewCampaignForm({
  action,
  templates,
  defaults,
}: {
  action: (formData: FormData) => Promise<void>;
  templates: TemplateItem[];
  defaults: Defaults;
}) {
  const [templateId, setTemplateId] = React.useState("");
  const selected = React.useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId]
  );

  const [name, setName] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [segment, setSegment] = React.useState("waitlist_pending");
  const [htmlBody, setHtmlBody] = React.useState("");
  const [textBody, setTextBody] = React.useState("");

  function loadTemplate() {
    if (!selected) return;

    // ✅ Fill only stable defaults here.
    // 🚫 DO NOT fill: first_name, footer_html, footer_text, unsubscribe_link
    //    (those must remain tokens for send-time per-recipient rendering)
    const { first_name, footer_html, footer_text, unsubscribe_link, ...known } =
      defaults as any;

    const vars: Vars = { ...known };

    setSubject(renderFromLib(selected.subject, vars as any));
    setHtmlBody(renderFromLib(selected.html.trim(), vars as any));
    setTextBody(renderFromLib(selected.text.trim(), vars as any));

    if (!name) setName(selected.name);
  }

  return (
    <form action={action} className="mt-4 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1 text-xs text-[#202030]/70">
          Template
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
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
          className="h-[38px] self-end rounded-2xl border px-4 text-sm font-semibold hover:bg-black/5 disabled:opacity-50"
        >
          Load template
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          placeholder="Campaign name (internal)"
          className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          name="subject"
          placeholder="Email subject"
          className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <select
          name="segment"
          className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
        >
          <option value="waitlist_pending">Waitlist: Pending</option>
          <option value="waitlist_approved">Waitlist: Approved</option>
          <option value="waitlist_all">Waitlist: All</option>
        </select>

        <textarea
          name="textBody"
          placeholder="Text body (optional)"
          rows={3}
          className="w-full rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E00040]/30 sm:col-span-2"
          value={textBody}
          onChange={(e) => setTextBody(e.target.value)}
        />
      </div>

      <textarea
        name="htmlBody"
        placeholder="HTML body (required) — paste HTML here"
        rows={10}
        className="w-full rounded-2xl border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-[#E00040]/30"
        required
        value={htmlBody}
        onChange={(e) => setHtmlBody(e.target.value)}
      />

      <button
        type="submit"
        className="w-fit rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
        style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
      >
        Create campaign →
      </button>
    </form>
  );
}
