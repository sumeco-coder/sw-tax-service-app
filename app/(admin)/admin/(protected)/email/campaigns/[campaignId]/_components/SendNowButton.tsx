// app/(admin)/admin/(protected)/email/campaigns/[campaignId]/_components/SendNowButton.tsx
"use client";

import { useFormStatus } from "react-dom";

export default function SendNowButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      style={{ background: "linear-gradient(90deg, #E00040, #B04020)" }}
    >
      {pending ? "Sending..." : "Send now"}
    </button>
  );
}
