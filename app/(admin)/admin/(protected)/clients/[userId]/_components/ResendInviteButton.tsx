"use client";

import { useState } from "react";
import { adminResendClientInvite } from "../actions";

export default function ResendInviteButton({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setMsg(null);
    try {
      await adminResendClientInvite(email);
      setMsg("Invite resent.");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to resend invite.");
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
      >
        {loading ? "Sending..." : "Resend Invite"}
      </button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
