// app/(client)/(protected)/(onboarding)/onboarding/complete/_components/CompleteButton.tsx
"use client";

import { useState } from "react";
import { updateUserAttributes } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";

export default function CompleteButton({ formId }: { formId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onClick() {
    setMsg("");
    setLoading(true);

    try {
      configureAmplify();

      await updateUserAttributes({
        userAttributes: {
          "custom:onboardingStep": "DONE",
          "custom:onboardingComplete": "true",
        },
      });

      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (!form) throw new Error("Could not find completion form.");

      const next =
        (form.querySelector('input[name="next"]') as HTMLInputElement | null)
          ?.value ?? "/dashboard";

      // ✅ Try API
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.redirectTo) {
        window.location.assign(data.redirectTo);
        return;
      }

      // ✅ Fallback: submit server action form
      form.requestSubmit();
    } catch (e: any) {
      setMsg(e?.message ?? "Could not finish onboarding. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-extrabold text-white shadow-sm ring-1 ring-black/5 hover:opacity-95 disabled:opacity-60"
        style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
      >
        {loading ? "Finishing..." : "Go to my dashboard"}
      </button>

      {msg ? <div className="mt-3 text-xs text-red-600">{msg}</div> : null}
    </>
  );
}
