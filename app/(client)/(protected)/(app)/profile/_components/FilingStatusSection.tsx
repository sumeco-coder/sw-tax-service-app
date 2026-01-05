"use client";

import React from "react";
import { Pencil, Check, X, ChevronDown } from "lucide-react";

type FilingStatus =
  | ""
  | "Single"
  | "Married Filing Jointly"
  | "Married Filing Separately"
  | "Head of Household"
  | "Qualifying Widow(er)";

type Props = {
  editFiling: boolean;
  setEditFiling: (v: boolean) => void;

  filingStatus: FilingStatus;
  setFilingStatus: (v: FilingStatus) => void;

  snapFilingStatus: FilingStatus;

  onSave: () => Promise<void> | void;
};

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
};

export default function FilingStatusSection({
  editFiling,
  setEditFiling,
  filingStatus,
  setFilingStatus,
  snapFilingStatus,
  onSave,
}: Props) {
  const brandGradient = {
    background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
  };

  return (
    <section className="text-slate-900">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Filing Status
      </label>

      {!editFiling ? (
        <div className="relative w-full">
          <input
            className={[
              "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-12 text-sm",
              "text-slate-900 placeholder:text-slate-400",
              "outline-none",
              "disabled:opacity-100",
            ].join(" ")}
            value={snapFilingStatus || ""}
            placeholder="Not set"
            readOnly
          />

          <button
            type="button"
            onClick={() => {
              setFilingStatus(snapFilingStatus);
              setEditFiling(true);
            }}
            title="Edit filing status"
            className="absolute inset-y-0 right-2 my-auto rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative w-full">
          <select
            value={filingStatus}
            onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
            className={[
              "w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-20 text-sm",
              "text-slate-900",
              "outline-none transition",
              "focus:ring-2 focus:ring-[#E72B69]/25 focus:border-[#E72B69]/40",
            ].join(" ")}
          >
            <option value="">Filing Status</option>
            <option>Single</option>
            <option>Married Filing Jointly</option>
            <option>Married Filing Separately</option>
            <option>Head of Household</option>
            <option>Qualifying Widow(er)</option>
          </select>

          {/* dropdown chevron */}
          <ChevronDown className="pointer-events-none absolute right-14 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <div className="absolute inset-y-0 right-2 my-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onSave}
              title="Save"
              className="rounded-lg p-1.5 text-white shadow-sm hover:opacity-90"
              style={brandGradient}
            >
              <Check className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setFilingStatus(snapFilingStatus);
                setEditFiling(false);
              }}
              title="Cancel"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
