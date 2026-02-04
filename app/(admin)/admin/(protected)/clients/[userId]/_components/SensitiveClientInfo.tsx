// app/(admin)/admin/(protected)/clients/[userId]/_components/SensitiveClientInfo.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
};

function formatSsn(digitsOrFormatted: string) {
  const d = String(digitsOrFormatted ?? "")
    .replace(/\D/g, "")
    .slice(0, 9);
  if (d.length !== 9) return "";
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

function maskSsn(last4: string) {
  const l4 = String(last4 ?? "")
    .replace(/\D/g, "")
    .slice(-4);
  return l4 ? `•••-••-${l4}` : "";
}

function maskAccountLast4(last4: string, label: string) {
  const l4 = String(last4 ?? "")
    .replace(/\D/g, "")
    .slice(-4);
  return l4 ? `${label} ****${l4}` : "";
}

type SsnState = {
  hasSsn: boolean;
  last4: string;
  full?: string;
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
  hasNumbersOnFile?: boolean;
};

type Props = {
  userId: string;
  canReveal: boolean; // ADMIN/SUPERADMIN only
};

export default function SensitiveClientInfo({ userId, canReveal }: Props) {
  const [loading, setLoading] = useState(true);

  const [revealSsnLoading, setRevealSsnLoading] = useState(false);
  const [revealDdLoading, setRevealDdLoading] = useState(false);

  const [ssnErr, setSsnErr] = useState("");
  const [ddErr, setDdErr] = useState("");

  const [ssn, setSsn] = useState<SsnState>({ hasSsn: false, last4: "" });

  const [dd, setDd] = useState<DdState>({
    useDirectDeposit: false,
    accountHolderName: "",
    bankName: "",
    accountType: "checking",
    routingLast4: "",
    accountLast4: "",
    updatedAt: null,
    hasNumbersOnFile: false,
  });

  const [showSsn, setShowSsn] = useState(false);
  const [showBank, setShowBank] = useState(false);

  const brandBar = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
    }),
    [],
  );

  async function fetchJson(url: string) {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      throw new Error(
        json?.error || json?.message || `Request failed (${res.status})`,
      );
    }
    return json;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setSsnErr("");
      setDdErr("");
      setShowSsn(false);
      setShowBank(false);

      const [ssnRes, ddRes] = await Promise.allSettled([
        fetchJson(`/api/admin/clients/${userId}/ssn`),
        fetchJson(`/api/admin/clients/${userId}/direct-deposit`),
      ]);

      if (ssnRes.status === "fulfilled") {
        const ssnJson = ssnRes.value as any;
        const hasSsn = Boolean(ssnJson?.hasSsn);
        const last4 = String(ssnJson?.last4 ?? ssnJson?.ssnLast4 ?? "");
        const full =
          ssnJson?.ssn ??
          ssnJson?.ssnFull ??
          ssnJson?.ssnFormatted ??
          undefined;

        setSsn({
          hasSsn,
          last4,
          full: full ? String(full) : undefined,
        });
      } else {
        setSsnErr(ssnRes.reason?.message ?? "Failed to load SSN.");
        setSsn({ hasSsn: false, last4: "" });
      }

      if (ddRes.status === "fulfilled") {
        const ddJson = ddRes.value as any;

        const routingLast4 = String(ddJson?.routingLast4 ?? "");
        const accountLast4 = String(ddJson?.accountLast4 ?? "");
        const fallbackHas = Boolean(routingLast4 || accountLast4);

        setDd({
          useDirectDeposit: Boolean(ddJson?.useDirectDeposit),
          accountHolderName: String(ddJson?.accountHolderName ?? ""),
          bankName: String(ddJson?.bankName ?? ""),
          accountType:
            ddJson?.accountType === "savings" ? "savings" : "checking",
          routingLast4,
          accountLast4,
          routingNumber: ddJson?.routingNumber
            ? String(ddJson.routingNumber)
            : undefined,
          accountNumber: ddJson?.accountNumber
            ? String(ddJson.accountNumber)
            : undefined,
          updatedAt: ddJson?.updatedAt ? String(ddJson.updatedAt) : null,
          hasNumbersOnFile: Boolean(ddJson?.hasNumbersOnFile ?? fallbackHas),
        });
      } else {
        setDdErr(ddRes.reason?.message ?? "Failed to load direct deposit.");
        setDd((prev) => ({ ...prev, hasNumbersOnFile: false }));
      }

      setLoading(false);
    })();
  }, [userId]);

  const ssnDisplay = showSsn
    ? ssn.full
      ? formatSsn(ssn.full)
      : maskSsn(ssn.last4)
    : maskSsn(ssn.last4);

  const routingDisplay = showBank
    ? dd.routingNumber
      ? `Routing ${dd.routingNumber}`
      : ""
    : maskAccountLast4(dd.routingLast4, "Routing");

  const acctDisplay = showBank
    ? dd.accountNumber
      ? `Account ${dd.accountNumber}`
      : ""
    : maskAccountLast4(dd.accountLast4, "Account");

  const showBtnClass =
    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold shadow-sm " +
    "border border-transparent text-white hover:opacity-95 active:opacity-90 disabled:opacity-50";

  async function toggleShowSsn() {
    if (revealSsnLoading) return;

    const willShow = !showSsn;
    setSsnErr("");

    if (!willShow) {
      setShowSsn(false);
      return;
    }

    // If this role can't reveal, don't even call the endpoint
    if (!canReveal) {
      setSsnErr("Reveal requires ADMIN or SUPERADMIN.");
      setShowSsn(false);
      return;
    }

    if (!window.confirm("Reveal full SSN? (Sensitive PII)")) return;

    setRevealSsnLoading(true);
    try {
      const ssnJson = await fetchJson(`/api/admin/clients/${userId}/ssn?reveal=1`);

      const hasSsn = Boolean(ssnJson?.hasSsn);
      const last4 = String(ssnJson?.last4 ?? ssnJson?.ssnLast4 ?? ssn.last4 ?? "");
      const full = ssnJson?.ssn ?? ssnJson?.ssnFull ?? ssnJson?.ssnFormatted ?? "";

      setSsn({ hasSsn, last4, full: full ? String(full) : undefined });

      if (!full) {
        setSsnErr(hasSsn ? "SSN exists but could not be revealed." : "No SSN on file.");
        setShowSsn(false);
        return;
      }

      setShowSsn(true);
    } catch (e: any) {
      setSsnErr(e?.message ?? "Failed to reveal SSN.");
      setShowSsn(false);
    } finally {
      setRevealSsnLoading(false);
    }
  }

  async function toggleShowBank() {
    if (revealDdLoading) return;

    const willShow = !showBank;
    setDdErr("");

    if (!willShow) {
      setShowBank(false);
      return;
    }

    if (!canReveal) {
      setDdErr("Reveal requires ADMIN or SUPERADMIN.");
      setShowBank(false);
      return;
    }

    if (!window.confirm("Reveal routing + account numbers? (Sensitive data)")) return;

    setRevealDdLoading(true);
    try {
      const ddJson = await fetchJson(
        `/api/admin/clients/${userId}/direct-deposit?reveal=1`,
      );

      const routingLast4 = String(ddJson?.routingLast4 ?? dd.routingLast4 ?? "");
      const accountLast4 = String(ddJson?.accountLast4 ?? dd.accountLast4 ?? "");
      const routingNumber = ddJson?.routingNumber ? String(ddJson.routingNumber) : "";
      const accountNumber = ddJson?.accountNumber ? String(ddJson.accountNumber) : "";

      const fallbackHas = Boolean(
        routingNumber || accountNumber || routingLast4 || accountLast4,
      );

      setDd((prev) => ({
        ...prev,
        useDirectDeposit: Boolean(ddJson?.useDirectDeposit),
        accountHolderName: String(
          ddJson?.accountHolderName ?? prev.accountHolderName ?? "",
        ),
        bankName: String(ddJson?.bankName ?? prev.bankName ?? ""),
        accountType: ddJson?.accountType === "savings" ? "savings" : "checking",
        routingLast4,
        accountLast4,
        routingNumber: routingNumber || undefined,
        accountNumber: accountNumber || undefined,
        updatedAt: ddJson?.updatedAt ? String(ddJson.updatedAt) : prev.updatedAt,
        hasNumbersOnFile: Boolean(ddJson?.hasNumbersOnFile ?? fallbackHas),
      }));

      if (!routingNumber && !accountNumber) {
        setDdErr("No direct deposit numbers on file to reveal.");
        setShowBank(false);
        return;
      }

      setShowBank(true);
    } catch (e: any) {
      setDdErr(e?.message ?? "Failed to reveal bank details.");
      setShowBank(false);
    } finally {
      setRevealDdLoading(false);
    }
  }

  const showSsnBtnDisabled = loading || revealSsnLoading || (!showSsn && !canReveal);
  const showBankBtnDisabled = loading || revealDdLoading || (!showBank && !canReveal);

  return (
    <div className="space-y-6">
      {/* SSN */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              SSN
            </h2>
            <div className="mt-2 h-1 w-28 rounded-full" style={brandBar} />
            <p className="mt-3 text-sm text-slate-600">
              Masked by default. Use Show to reveal.
            </p>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <button
                    type="button"
                    onClick={toggleShowSsn}
                    className={showBtnClass}
                    style={{ background: BRAND.pink }}
                    disabled={showSsnBtnDisabled}
                    title="Show / Hide SSN"
                  >
                    {showSsn ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {revealSsnLoading ? "Revealing…" : showSsn ? "Hide" : "Show"}
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {showSsn
                  ? "Hide SSN"
                  : canReveal
                    ? "Reveal SSN"
                    : "Reveal requires ADMIN/SUPERADMIN"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          {loading ? (
            <>Loading…</>
          ) : ssn.hasSsn || ssn.last4 ? (
            <>On file: {ssnDisplay || "—"}</>
          ) : (
            <>No SSN on file.</>
          )}
        </div>

        {ssnErr ? <p className="mt-3 text-sm text-red-600">{ssnErr}</p> : null}
      </div>

      {/* Direct Deposit */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Direct Deposit
            </h2>
            <div className="mt-2 h-1 w-28 rounded-full" style={brandBar} />
            <p className="mt-3 text-sm text-slate-600">
              Masked by default. Use Show to reveal.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <ShieldCheck className="h-4 w-4" />
            Encrypted & protected
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="text-xs text-slate-500">Use Direct Deposit</div>
            <div className="mt-1 font-semibold text-slate-900">
              {dd.useDirectDeposit ? "Yes" : "No"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="text-xs text-slate-500">Account Type</div>
            <div className="mt-1 font-semibold text-slate-900">
              {dd.accountType}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="text-xs text-slate-500">Account Holder</div>
            <div className="mt-1 font-semibold text-slate-900">
              {dd.accountHolderName || "—"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="text-xs text-slate-500">Bank Name</div>
            <div className="mt-1 font-semibold text-slate-900">
              {dd.bankName || "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">Numbers</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {routingDisplay}
                  {routingDisplay && acctDisplay ? " • " : ""}
                  {acctDisplay}
                </div>

                {process.env.NODE_ENV !== "production" && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    debug: hasNumbersOnFile={String(dd.hasNumbersOnFile)}{" "}
                    routingLast4={dd.routingLast4} accountLast4={dd.accountLast4}
                  </div>
                )}
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <button
                        type="button"
                        onClick={toggleShowBank}
                        className={showBtnClass}
                        style={{ background: BRAND.pink }}
                        disabled={showBankBtnDisabled}
                        title="Show / Hide bank numbers"
                      >
                        {showBank ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        {revealDdLoading ? "Revealing…" : showBank ? "Hide" : "Show"}
                      </button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showBank
                      ? "Hide account numbers"
                      : canReveal
                        ? "Reveal account numbers"
                        : "Reveal requires ADMIN/SUPERADMIN"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {dd.updatedAt ? (
              <div className="mt-2 text-xs text-slate-500">
                Updated: {new Date(dd.updatedAt).toLocaleString("en-US")}
              </div>
            ) : null}

            {loading ? (
              <div className="mt-2 text-xs text-slate-500">Loading…</div>
            ) : null}
          </div>
        </div>

        {ddErr ? <p className="mt-4 text-sm text-red-600">{ddErr}</p> : null}
      </div>
    </div>
  );
}
