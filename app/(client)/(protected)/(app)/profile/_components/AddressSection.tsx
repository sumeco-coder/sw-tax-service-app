"use client";

import React from "react";
import { Pencil, Check, X } from "lucide-react";

type FormState = {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
};

type Props = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  snap: FormState;

  editAddress: boolean;
  setEditAddress: (v: boolean) => void;

  onSave: () => Promise<void> | void;
};

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
};

const US_STATES = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
] as const;

export default function AddressSection({
  form,
  setForm,
  snap,
  editAddress,
  setEditAddress,
  onSave,
}: Props) {
  const brandGradient = {
    background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
  };

  const inputClass = [
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition",
    "text-slate-900 placeholder:text-slate-400",
    editAddress ? "bg-white" : "bg-slate-50",
    "focus:ring-2 focus:ring-[#E72B69]/25 focus:border-[#E72B69]/40",
    // IMPORTANT: don't let disabled fade to invisible
    "disabled:opacity-100 disabled:text-slate-700",
  ].join(" ");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-900">
      {/* Header row */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Address</h2>
          <p className="mt-1 text-xs text-slate-500">
            This helps us prepare your return accurately and avoid delays.
          </p>
        </div>

        {!editAddress ? (
          <button
            type="button"
            onClick={() => {
              setForm(snap);
              setEditAddress(true);
            }}
            title="Edit address"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              title="Save address"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              style={brandGradient}
            >
              <Check className="h-4 w-4" />
              Save
            </button>

            <button
              type="button"
              onClick={() => {
                setForm(snap);
                setEditAddress(false);
              }}
              title="Cancel"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Address line 1 */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Address line 1
        </label>
        <input
          className={inputClass}
          placeholder="Street address"
          value={form.address1}
          onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))}
          disabled={!editAddress}
        />
      </div>

      {/* Address line 2 */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Address line 2
        </label>
        <input
          className={inputClass}
          placeholder="Apt, Suite (optional)"
          value={form.address2}
          onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))}
          disabled={!editAddress}
        />
      </div>

      {/* City / State / ZIP */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            City
          </label>
          <input
            className={inputClass}
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            disabled={!editAddress}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            State
          </label>
          <select
  className={inputClass + " appearance-none"}
  value={form.state}
  onChange={(e) =>
    setForm((f) => ({
      ...f,
      state: e.target.value,
    }))
  }
  disabled={!editAddress}
>
  <option value="">Select state</option>
  {US_STATES.map((s) => (
    <option key={s.abbr} value={s.abbr}>
      {s.name} ({s.abbr})
    </option>
  ))}
</select>

        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            ZIP
          </label>
          <input
            className={inputClass}
            placeholder="##### or #####-####"
            inputMode="numeric"
            value={form.zip}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                zip: e.target.value.replace(/[^0-9\-]/g, ""),
              }))
            }
            disabled={!editAddress}
          />
        </div>
      </div>
    </section>
  );
}
