// app/(client)/profile/_components/Identity.tsx
"use client";

import React from "react";
import { Lock } from "lucide-react";

export type IdentityView = {
  firstName: string;
  middleInitial: string; // 0-1 char
  lastName: string;
  dob: string; // YYYY-MM-DD
};

type Props = {
  identity: IdentityView;
};

export default function Identity({ identity }: Props) {
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm " +
    "text-slate-900 placeholder:text-slate-400 outline-none " +
    "disabled:opacity-100 disabled:text-slate-900";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Identity</h2>
          <p className="mt-1 text-xs text-slate-500">
            Identity details are locked for security. Contact support if anything needs to be changed.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          <Lock className="h-4 w-4" />
          Locked
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            First name
          </label>
          <input
            className={inputClass}
            value={identity.firstName || ""}
            placeholder="Not set"
            disabled
            readOnly
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Middle initial
          </label>
          <input
            className={inputClass}
            value={identity.middleInitial || ""}
            placeholder="Not set"
            disabled
            readOnly
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Last name
          </label>
          <input
            className={inputClass}
            value={identity.lastName || ""}
            placeholder="Not set"
            disabled
            readOnly
          />
        </div>
      </div>

      <div className="mt-4 max-w-sm">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Date of birth
        </label>
        <input
          className={inputClass}
          type="date"
          value={identity.dob || ""}
          disabled
          readOnly
        />
      </div>
    </section>
  );
}
