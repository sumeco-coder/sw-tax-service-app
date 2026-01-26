"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";

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

function formatSsn(digits: string) {
  const d = onlyDigits(digits).slice(0, 9);
  if (d.length !== 9) return digits;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

function maskedFromLast4(last4: string) {
  const l4 = onlyDigits(last4).slice(0, 4);
  return l4 ? `***-**-${l4}` : "";
}

export default function SsnSection({ ssnLast4, onSaved }: Props) {
  const hasSsn = Boolean(ssnLast4);

  const [open, setOpen] = useState(false);
  const [ssn, setSsn] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // reveal state
  const [reveal, setReveal] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const [ssnFull, setSsnFull] = useState("");

  useEffect(() => {
    // if parent last4 changes, hide full again
    setReveal(false);
    setSsnFull("");
  }, [ssnLast4]);

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
      setMsg("✅ SSN saved. You can view it anytime in Profile.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Could not save SSN.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleReveal() {
    if (reveal) {
      setReveal(false);
      setSsnFull("");
      return;
    }

    setMsg("");
    setRevealLoading(true);
    try {
      const res = await fetch("/api/profile/ssn?reveal=1", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Could not reveal SSN.");

      const full = String(data?.ssn ?? "");
      if (!full) throw new Error("No SSN on file.");

      setSsnFull(full); // already formatted by API
      setReveal(true);
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "Could not reveal SSN"}`);
      setReveal(false);
      setSsnFull("");
    } finally {
      setRevealLoading(false);
    }
  }

  const display = hasSsn ? (reveal ? ssnFull : maskedFromLast4(ssnLast4)) : "";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">SSN</h2>
          <p className="mt-1 text-xs text-slate-500">
            {hasSsn
              ? "SSN is stored securely. Click Show only when needed."
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
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          <div>On file: {display}</div>

          <button
            type="button"
            onClick={() => void toggleReveal()}
            disabled={revealLoading}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-60"
            aria-label={reveal ? "Hide SSN" : "Show SSN"}
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {reveal ? "Hide" : revealLoading ? "Loading…" : "Show"}
          </button>
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
            value={formatSsn(ssn)}
            onChange={(e) => setSsn(onlyDigits(e.target.value).slice(0, 9))}
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
