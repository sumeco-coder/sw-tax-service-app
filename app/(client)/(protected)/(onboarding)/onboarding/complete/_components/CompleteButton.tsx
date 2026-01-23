"use client";

import { useState } from "react";

export default function CompleteButton({ formId }: { formId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onClick() {
    setMsg("");
    setLoading(true);

    try {
      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (!form) throw new Error("Completion form not found.");

      // 🔑 SINGLE source of truth
      form.requestSubmit();
    } catch (e: any) {
      setMsg(e?.message ?? "Could not finish onboarding.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-extrabold text-white shadow-sm disabled:opacity-60"
        style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
      >
        {loading ? "Finishing..." : "Go to my dashboard"}
      </button>

      {msg && <div className="mt-3 text-xs text-red-600">{msg}</div>}
    </>
  );
}
