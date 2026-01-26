// app/(admin)/admin/(protected)/clients/[userId]/dependents/DependentSsnReveal.tsx
"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, RefreshCcw } from "lucide-react";

function maskSsn(last4?: string | null) {
  const l4 = String(last4 ?? "").replace(/\D/g, "").slice(-4);
  return l4 ? `•••-••-${l4}` : "On file";
}

function formatSsn(digitsOrFormatted: string) {
  const d = String(digitsOrFormatted ?? "").replace(/\D/g, "").slice(0, 9);
  if (d.length !== 9) return "";
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export default function DependentSsnReveal(props: {
  userId: string;
  dependentId: string;
  appliedButNotReceived: boolean;
  hasSsn: boolean;
  last4?: string | null;
}) {
  const { userId, dependentId, appliedButNotReceived, hasSsn, last4 } = props;

  const [show, setShow] = useState(false);
  const [full, setFull] = useState("");
  const [err, setErr] = useState("");
  const [isPending, startTransition] = useTransition();

  const masked = appliedButNotReceived
    ? "Applied / not received"
    : hasSsn
      ? maskSsn(last4)
      : "Missing";

  async function onToggle() {
    setErr("");

    if (show) {
      setShow(false);
      return;
    }

    if (!hasSsn || appliedButNotReceived) return;

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/clients/${userId}/dependents/${dependentId}/ssn?reveal=1`,
          { method: "GET", cache: "no-store", credentials: "include" },
        );

        const json = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) throw new Error(json?.message ?? json?.error ?? `Request failed (${res.status})`);

        const ssn = formatSsn(String(json?.ssn ?? ""));
        if (!ssn) throw new Error("No SSN on file to reveal.");

        setFull(ssn);
        setShow(true);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to reveal SSN.");
        setShow(false);
      }
    });
  }

  const value = show && full ? full : masked;

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-xs">{value}</span>

      {hasSsn && !appliedButNotReceived ? (
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-muted"
          aria-label={show ? "Hide SSN" : "Reveal SSN"}
          title={show ? "Hide SSN" : "Reveal SSN"}
        >
          {isPending ? (
            <RefreshCcw className="h-4 w-4 animate-spin" />
          ) : show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      ) : null}

      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </span>
  );
}
