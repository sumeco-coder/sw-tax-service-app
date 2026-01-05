// app/(client)/profile/_components/SsnSection.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
};

type Props = {
  ssnLast4: string; // "" if none
  onSaved: (last4: string) => void;
};

function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

export default function SsnSection({ ssnLast4, onSaved }: Props) {
  const hasSsn = Boolean(ssnLast4);

  const [open, setOpen] = useState(false);
  const [ssn, setSsn] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const brandGradient = useMemo(
    () => ({ background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }),
    []
  );

  async function saveSsn() {
    setMsg("");
    setLoading(true);
    try {
      const digits = onlyDigits(ssn);
      if (digits.length !== 9) {
        setMsg("SSN must be 9 digits.");
        return;
      }

      const res = await fetch("/api/profile/ssn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssn: digits }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.message ?? "Could not save SSN.");
        return;
      }

      const last4 = String(data?.last4 ?? digits.slice(-4));
      onSaved(last4);

      setOpen(false);
      setSsn("");
      setMsg("Saved ✅");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Could not save SSN.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">SSN</h2>
          <p className="mt-1 text-xs text-slate-500">
            {hasSsn
              ? "SSN is locked for security. Contact support if it needs to be changed."
              : "Add your SSN once. It will be stored securely and then locked."}
          </p>
        </div>

        {hasSsn ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            <Lock className="h-4 w-4" />
            Locked
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            style={brandGradient}
          >
            <ShieldCheck className="h-4 w-4" />
            {open ? "Close" : "Add SSN"}
          </button>
        )}
      </div>

      {hasSsn ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          On file: •••-••-{ssnLast4}
        </div>
      ) : open ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Social Security Number
          </label>
          <input
            type="password"
            inputMode="numeric"
            placeholder="###-##-####"
            value={ssn}
            onChange={(e) => setSsn(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#E72B69]/25 focus:border-[#E72B69]/40"
          />

          <button
            type="button"
            disabled={loading}
            onClick={saveSsn}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            style={brandGradient}
          >
            {loading ? "Saving…" : "Save SSN"}
          </button>
        </div>
      ) : null}

      {msg && (
        <p className="mt-3 text-sm text-slate-600" aria-live="polite">
          {msg}
        </p>
      )}
    </section>
  );
}
