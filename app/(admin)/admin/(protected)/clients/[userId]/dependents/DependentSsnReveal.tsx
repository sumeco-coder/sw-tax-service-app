// app/(admin)/admin/(protected)/clients/[userId]/dependents/DependentSsnReveal.tsx
"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, RefreshCcw } from "lucide-react";
import { revealDependentSsn } from "./actions";

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
  const [isPending, startTransition] = useTransition();

  const masked =
    appliedButNotReceived
      ? "Applied / not received"
      : hasSsn
        ? last4
          ? `***-**-${last4}`
          : "On file"
        : "Missing";

  async function onToggle() {
    if (show) {
      setShow(false);
      return;
    }

    if (!hasSsn || appliedButNotReceived) return;

    startTransition(async () => {
      const res = await revealDependentSsn(userId, dependentId);
      setFull(String((res as any)?.ssn ?? ""));
      setShow(true);
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
    </span>
  );
}
