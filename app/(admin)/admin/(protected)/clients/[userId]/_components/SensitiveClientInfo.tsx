"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
};

function formatSsn(digitsOrFormatted: string) {
  const d = String(digitsOrFormatted ?? "").replace(/\D/g, "").slice(0, 9);
  if (d.length !== 9) return "";
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

function maskSsn(last4: string) {
  const l4 = String(last4 ?? "").replace(/\D/g, "").slice(-4);
  return l4 ? `•••-••-${l4}` : "";
}

function maskAccountLast4(last4: string, label: string) {
  const l4 = String(last4 ?? "").replace(/\D/g, "").slice(-4);
  return l4 ? `${label} ****${l4}` : "";
}

type SsnState = {
  last4: string;
  full?: string; // may be digits or formatted; we format anyway
};

type DdState = {
  useDirectDeposit: boolean;
  accountHolderName: string;
  bankName: string;
  accountType: "checking" | "savings";
  routingLast4: string;
  accountLast4: string;
  routingNumber?: string;
  accountNumber?: string;
  updatedAt: string | null;
};

export default function SensitiveClientInfo({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [revealSsnLoading, setRevealSsnLoading] = useState(false);
  const [revealDdLoading, setRevealDdLoading] = useState(false);
  const [err, setErr] = useState("");

  const [ssn, setSsn] = useState<SsnState>({ last4: "" });

  const [dd, setDd] = useState<DdState>({
    useDirectDeposit: false,
    accountHolderName: "",
    bankName: "",
    accountType: "checking",
    routingLast4: "",
    accountLast4: "",
    updatedAt: null,
  });

  const [showSsn, setShowSsn] = useState(false);
  const [showBank, setShowBank] = useState(false);

  const brandBar = useMemo(
    () => ({ background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})` }),
    []
  );

  async function fetchJson(url: string) {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      throw new Error(json?.error || json?.message || `Request failed (${res.status})`);
    }
    return json;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      setShowSsn(false);
      setShowBank(false);

      try {
        const [ssnJson, ddJson] = await Promise.all([
          fetchJson(`/api/admin/clients/${userId}/ssn`),
          fetchJson(`/api/admin/clients/${userId}/direct-deposit`),
        ]);

        // ✅ Accept either API shape:
        // SSN route may return: { last4, ssn } OR { ssnLast4, ssnFull } etc.
        const last4 = String(ssnJson?.last4 ?? ssnJson?.ssnLast4 ?? "");
        const full = ssnJson?.ssn ?? ssnJson?.ssnFull ?? ssnJson?.ssnFormatted ?? undefined;

        setSsn({
          last4,
          full: full ? String(full) : undefined,
        });

        setDd({
          useDirectDeposit: Boolean(ddJson?.useDirectDeposit),
          accountHolderName: String(ddJson?.accountHolderName ?? ""),
          bankName: String(ddJson?.bankName ?? ""),
          accountType: ddJson?.accountType === "savings" ? "savings" : "checking",
          routingLast4: String(ddJson?.routingLast4 ?? ""),
          accountLast4: String(ddJson?.accountLast4 ?? ""),
          routingNumber: ddJson?.routingNumber ? String(ddJson.routingNumber) : undefined,
          accountNumber: ddJson?.accountNumber ? String(ddJson.accountNumber) : undefined,
          updatedAt: ddJson?.updatedAt ? String(ddJson.updatedAt) : null,
        });
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load sensitive info.");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const ssnDisplay = showSsn
    ? (ssn.full ? formatSsn(ssn.full) : "")
    : maskSsn(ssn.last4);

  const routingDisplay = showBank
    ? (dd.routingNumber ?? "")
    : maskAccountLast4(dd.routingLast4, "Routing");

  const acctDisplay = showBank
    ? (dd.accountNumber ?? "")
    : maskAccountLast4(dd.accountLast4, "Account");

  async function toggleShowSsn() {
    const willShow = !showSsn;

    if (!willShow) {
      setShowSsn(false);
      return;
    }

    // If we don't already have full SSN, fetch reveal
    if (!ssn.full) {
      setRevealSsnLoading(true);
      setErr("");
      try {
        const ssnJson = await fetchJson(`/api/admin/clients/${userId}/ssn?reveal=1`);
        const full = ssnJson?.ssn ?? ssnJson?.ssnFull ?? ssnJson?.ssnFormatted ?? "";
        const last4 = String(ssnJson?.last4 ?? ssnJson?.ssnLast4 ?? ssn.last4 ?? "");

        setSsn({
          last4,
          full: full ? String(full) : undefined,
        });
      } catch (e: any) {
        setErr(e?.message ?? "Failed to reveal SSN.");
        setShowSsn(false);
      } finally {
        setRevealSsnLoading(false);
      }
    }

    setShowSsn(true);
  }

  async function toggleShowBank() {
    const willShow = !showBank;

    if (!willShow) {
      setShowBank(false);
      return;
    }

    // If we don't already have full routing/account, fetch reveal
    if (!dd.routingNumber || !dd.accountNumber) {
      setRevealDdLoading(true);
      setErr("");
      try {
        const ddJson = await fetchJson(`/api/admin/clients/${userId}/direct-deposit?reveal=1`);

        setDd((prev) => ({
          ...prev,
          useDirectDeposit: Boolean(ddJson?.useDirectDeposit),
          accountHolderName: String(ddJson?.accountHolderName ?? prev.accountHolderName ?? ""),
          bankName: String(ddJson?.bankName ?? prev.bankName ?? ""),
          accountType: ddJson?.accountType === "savings" ? "savings" : "checking",
          routingLast4: String(ddJson?.routingLast4 ?? prev.routingLast4 ?? ""),
          accountLast4: String(ddJson?.accountLast4 ?? prev.accountLast4 ?? ""),
          routingNumber: ddJson?.routingNumber ? String(ddJson.routingNumber) : prev.routingNumber,
          accountNumber: ddJson?.accountNumber ? String(ddJson.accountNumber) : prev.accountNumber,
          updatedAt: ddJson?.updatedAt ? String(ddJson.updatedAt) : prev.updatedAt,
        }));
      } catch (e: any) {
        setErr(e?.message ?? "Failed to reveal bank details.");
        setShowBank(false);
      } finally {
        setRevealDdLoading(false);
      }
    }

    setShowBank(true);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">SSN</h2>
            <div className="mt-2 h-1 w-28 rounded-full" style={brandBar} />
            <p className="mt-3 text-sm text-slate-600">Masked by default. Use Show to reveal.</p>
          </div>

          <button
            type="button"
            onClick={toggleShowSsn}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            disabled={loading || revealSsnLoading || !ssn.last4}
            title={!ssn.last4 ? "No SSN on file" : ""}
          >
            {showSsn ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {revealSsnLoading ? "Revealing…" : showSsn ? "Hide" : "Show"}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          {ssn.last4 ? <>On file: {ssnDisplay}</> : <>No SSN on file.</>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Direct Deposit</h2>
            <div className="mt-2 h-1 w-28 rounded-full" style={brandBar} />
            <p className="mt-3 text-sm text-slate-600">Masked by default. Use Show to reveal.</p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <ShieldCheck className="h-4 w-4" />
            Encrypted & protected
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="text-xs text-slate-500">Use Direct Deposit</div>
            <div className="mt-1 font-semibold text-slate-900">{dd.useDirectDeposit ? "Yes" : "No"}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="text-xs text-slate-500">Account Type</div>
            <div className="mt-1 font-semibold text-slate-900">{dd.accountType}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="text-xs text-slate-500">Account Holder</div>
            <div className="mt-1 font-semibold text-slate-900">{dd.accountHolderName || "—"}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="text-xs text-slate-500">Bank Name</div>
            <div className="mt-1 font-semibold text-slate-900">{dd.bankName || "—"}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">Numbers</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {routingDisplay}
                  {routingDisplay && acctDisplay ? " • " : ""}
                  {acctDisplay}
                </div>
              </div>

              <button
                type="button"
                onClick={toggleShowBank}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={loading || revealDdLoading || (!dd.routingLast4 && !dd.accountLast4)}
                title={!dd.routingLast4 && !dd.accountLast4 ? "No direct deposit numbers on file" : ""}
              >
                {showBank ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {revealDdLoading ? "Revealing…" : showBank ? "Hide" : "Show"}
              </button>
            </div>

            {dd.updatedAt ? (
              <div className="mt-2 text-xs text-slate-500">
                Updated: {new Date(dd.updatedAt).toLocaleString("en-US")}
              </div>
            ) : null}
          </div>
        </div>

        {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}
        {loading ? <p className="mt-4 text-sm text-slate-600">Loading…</p> : null}
      </div>
    </div>
  );
}
