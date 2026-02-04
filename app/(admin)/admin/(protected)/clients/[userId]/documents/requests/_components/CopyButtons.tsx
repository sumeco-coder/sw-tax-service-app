// app/(admin)/admin/(protected)/clients/[userId]/documents/requests/_components/CopyButtons.tsx
"use client";

import { useState } from "react";

async function copyText(s: string) {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = s;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export default function CopyButtons({
  subject,
  text,
  uploadLink,
}: {
  subject: string;
  text: string;
  uploadLink: string;
}) {
  const [msg, setMsg] = useState("");

  const run = async (label: string, value: string) => {
    const ok = await copyText(value);
    setMsg(ok ? `${label} copied ✅` : `Copy failed`);
    setTimeout(() => setMsg(""), 1600);
  };

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Copy tools</div>
          <div className="text-xs text-muted-foreground">
            Use these instead of relying on mailto.
          </div>
        </div>

        {msg ? (
          <div className="text-xs font-semibold text-emerald-700">{msg}</div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run("Subject", subject)}
          className="rounded-xl border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          Copy subject
        </button>

        <button
          type="button"
          onClick={() => run("Email body", text)}
          className="rounded-xl border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          Copy body
        </button>

        <button
          type="button"
          onClick={() => run("Upload link", uploadLink)}
          className="rounded-xl border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
        >
          Copy upload link
        </button>

        <button
          type="button"
          onClick={() => run("Full email (subject + body)", `Subject: ${subject}\n\n${text}`)}
          className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background hover:opacity-90"
        >
          Copy full email
        </button>
      </div>
    </div>
  );
}
