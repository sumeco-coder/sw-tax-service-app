"use client";

import React from "react";
import { Pencil, Check, X } from "lucide-react";

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

export default function FilingStatusSection({
  editFiling,
  setEditFiling,
  filingStatus,
  setFilingStatus,
  snapFilingStatus,
  onSave,
}: Props) {
  return (
    <section>
      <label className="block text-sm text-gray-600 mb-1">Filing Status</label>

      {!editFiling && (
        <div className="relative inline-block w-full max-w-xs">
          <input
            className="border w-full rounded-lg p-2 pr-12 bg-gray-50"
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
            className="absolute inset-y-0 right-2 my-auto p-1 rounded hover:bg-gray-100"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}

      {editFiling && (
        <div className="relative inline-block w-full max-w-xs">
          <select
            value={filingStatus}
            onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
            className="border w-full rounded-lg p-2 pr-20"
          >
            <option value="">Filing Status</option>
            <option>Single</option>
            <option>Married Filing Jointly</option>
            <option>Married Filing Separately</option>
            <option>Head of Household</option>
            <option>Qualifying Widow(er)</option>
          </select>

          <div className="absolute inset-y-0 right-2 my-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onSave}
              title="Save"
              className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setFilingStatus(snapFilingStatus);
                setEditFiling(false);
              }}
              title="Cancel"
              className="p-1 rounded hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
