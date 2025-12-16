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

export default function AddressSection({
  form,
  setForm,
  snap,
  editAddress,
  setEditAddress,
  onSave,
}: Props) {
  return (
    <section className="mt-6 border rounded-xl p-4">
      <h2 className="font-semibold text-gray-900 mb-2">Address</h2>

      {/* Address line 1 w/ controls */}
      <div className="relative mb-3">
        <label className="block text-sm text-gray-600 mb-1">Address line 1</label>
        <input
          className={`border w-full rounded-lg p-2 pr-20 ${
            editAddress ? "" : "bg-gray-50"
          }`}
          placeholder="Address line 1"
          value={form.address1}
          onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))}
          disabled={!editAddress}
        />

        <div className="absolute inset-y-7 right-2 flex items-center gap-1">
          {editAddress ? (
            <>
              <button
                type="button"
                onClick={onSave}
                title="Save address"
                className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(snap);
                  setEditAddress(false);
                }}
                title="Cancel"
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setForm(snap);
                setEditAddress(true);
              }}
              title="Edit address"
              className="p-1 rounded hover:bg-gray-100"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Address line 2 */}
      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Address line 2</label>
        <input
          className={`border w-full rounded-lg p-2 ${
            editAddress ? "" : "bg-gray-50"
          }`}
          placeholder="Apt, Suite (optional)"
          value={form.address2}
          onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))}
          disabled={!editAddress}
        />
      </div>

      {/* City / State / ZIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">City</label>
          <input
            className={`border w-full rounded-lg p-2 ${
              editAddress ? "" : "bg-gray-50"
            }`}
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            disabled={!editAddress}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">State</label>
          <input
            className={`border w-full rounded-lg p-2 ${
              editAddress ? "" : "bg-gray-50"
            }`}
            placeholder="NV"
            value={form.state}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                state: e.target.value.toUpperCase().slice(0, 2),
              }))
            }
            disabled={!editAddress}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">ZIP</label>
          <input
            className={`border w-full rounded-lg p-2 ${
              editAddress ? "" : "bg-gray-50"
            }`}
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
