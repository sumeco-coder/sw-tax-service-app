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

type ListItem = { id: string; name: string };

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

type AudienceUI = "waitlist" | "list" | "appointments" | "manual";

type Segment =
  | "waitlist_pending"
  | "waitlist_approved"
  | "waitlist_all"
  | "email_list"
  | "appointments"
  | "manual";

type ApptSegment = "upcoming" | "today" | "past" | "cancelled" | "all";

export default function SendCampaignForm({
  templates = [], // ✅ default
  lists = [],     // ✅ default
  action,
}: {
  templates?: TemplateItem[]; // ✅ optional
  lists?: ListItem[];         // ✅ optional
  action: (formData: FormData) => Promise<void>;
}) {
  const [templateId, setTemplateId] = React.useState<string>("");

  const selected = React.useMemo(
    () => (templates ?? []).find((t) => t.id === templateId),
    [templates, templateId]
  );

  const [subject, setSubject] = React.useState("");
  const [htmlBody, setHtmlBody] = React.useState("");
  const [textBody, setTextBody] = React.useState("");

  const [audience, setAudience] = React.useState<AudienceUI>("waitlist");

  const [waitlistSegment, setWaitlistSegment] = React.useState<
    "waitlist_pending" | "waitlist_approved" | "waitlist_all"
  >("waitlist_pending");

  const [apptSegment, setApptSegment] = React.useState<ApptSegment>("upcoming");

  const segment: Segment = React.useMemo(() => {
    if (audience === "waitlist") return waitlistSegment;
    if (audience === "list") return "email_list";
    if (audience === "appointments") return "appointments";
    return "manual";
  }, [audience, waitlistSegment]);

  function loadTemplate() {
    if (!selected) return;
    setSubject(selected.subject ?? "");
    setHtmlBody((selected.html ?? "").trim());
    setTextBody((selected.text ?? "").trim());
  }

  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="segment" value={segment} />

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
          Audience
          <select
            name="audience"
            className="rounded-lg border px-3 py-2 text-sm"
            value={audience}
            onChange={(e) => setAudience(e.target.value as AudienceUI)}
          >
            <option value="waitlist">Waitlist</option>
            <option value="list">Email List</option>
            <option value="appointments">Appointments</option>
            <option value="manual">Manual</option>
          </select>
        </label>
      </div>

      {/* WAITLIST */}
      <label className="grid gap-1 text-xs text-gray-600">
        Waitlist segment
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          value={waitlistSegment}
          onChange={(e) => setWaitlistSegment(e.target.value as any)}
          disabled={audience !== "waitlist"}
        >
          <option value="waitlist_pending">Pending</option>
          <option value="waitlist_approved">Approved</option>
          <option value="waitlist_all">All</option>
        </select>
      </label>

      {/* EMAIL LIST */}
      <label className="grid gap-1 text-xs text-gray-600">
        Email list
        <select
          name="listId"
          className="rounded-lg border px-3 py-2 text-sm"
          defaultValue=""
          disabled={audience !== "list"}
        >
          <option value="">— Select list —</option>
          {(lists ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      {/* APPOINTMENTS */}
      <label className="grid gap-1 text-xs text-gray-600">
        Appointments segment
        <select
          name="apptSegment"
          className="rounded-lg border px-3 py-2 text-sm"
          value={apptSegment}
          onChange={(e) => setApptSegment(e.target.value as ApptSegment)}
          disabled={audience !== "appointments"}
        >
          <option value="upcoming">Upcoming</option>
          <option value="today">Today</option>
          <option value="past">Past</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
      </label>

      {/* MANUAL */}
      <label className="grid gap-1 text-xs text-gray-600">
        Manual recipients (comma/newline separated)
        <textarea
          name="manualEmails"
          rows={4}
          className="rounded-lg border px-3 py-2 text-sm font-mono"
          placeholder={"john@email.com\njane@email.com, bob@email.com"}
          disabled={audience !== "manual"}
        />
      </label>

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
            {(templates ?? []).map((t) => (
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
        />
      </label>

      <SubmitButton />
    </form>
  );
}
