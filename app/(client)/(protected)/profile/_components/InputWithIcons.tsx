"use client";

import React from "react";
import { Pencil, Check, X } from "lucide-react";

export type EditKeys =
  | "email"
  | "phone"
  | "address1"
  | "address2"
  | "city"
  | "state"
  | "zip"
  | "filingStatus";

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
};

type Props = {
  field: EditKeys;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;

  edit: Record<EditKeys, boolean>;
  toggle: (field: EditKeys, on?: boolean) => void;

  // Save handlers
  saveEmail: () => Promise<void>;
  savePhone: () => Promise<void>;
  saveAddressField: (field: EditKeys) => Promise<void>;

  // Email verification
  emailPending: boolean;
  emailCode: string;
  setEmailCode: (v: string) => void;
  emailMsg: string;
  verifyEmail: () => Promise<void>;
  resendEmail: () => Promise<void>;

  // Phone verification
  phonePending: boolean;
  phoneCode: string;
  setPhoneCode: (v: string) => void;
  phoneMsg: string;
  verifyPhone: () => Promise<void>;
  resendPhone: () => Promise<void>;
};

export default function InputWithIcons({
  field,
  type = "text",
  placeholder,
  value,
  onChange,
  edit,
  toggle,
  saveEmail,
  savePhone,
  saveAddressField,
  emailPending,
  emailCode,
  setEmailCode,
  emailMsg,
  verifyEmail,
  resendEmail,
  phonePending,
  phoneCode,
  setPhoneCode,
  phoneMsg,
  verifyPhone,
  resendPhone,
}: Props) {
  const isEditing = edit[field];

  async function onSaveClick() {
    if (field === "email") {
      if (!emailPending) await saveEmail();
      return;
    }
    if (field === "phone") {
      if (!phonePending) await savePhone();
      return;
    }
    await saveAddressField(field);
  }

  const brandGradient = {
    background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
  };

  return (
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!isEditing}
        className={[
          "w-full rounded-xl border px-3 py-2 pr-16 text-sm outline-none transition",
          "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400",
          "focus:ring-2 focus:ring-[#E72B69]/25 focus:border-[#E72B69]/40",
          // IMPORTANT: don't let disabled make it fade out
          "disabled:opacity-100 disabled:text-slate-700 disabled:bg-slate-50",
        ].join(" ")}
      />

      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={onSaveClick}
              title="Save"
              className="rounded-lg p-1.5 text-white shadow-sm hover:opacity-90"
              style={brandGradient}
            >
              <Check className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => toggle(field, false)}
              title="Cancel"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => toggle(field, true)}
            title="Edit"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Email verification lane */}
      {field === "email" && isEditing && emailPending && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="w-full sm:w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 tracking-widest outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#E72B69]/25 focus:border-[#E72B69]/40"
            placeholder="6-digit code"
            value={emailCode}
            onChange={(e) => setEmailCode(e.target.value)}
            inputMode="numeric"
          />

          <button
            type="button"
            onClick={verifyEmail}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={brandGradient}
          >
            Verify
          </button>

          <button
            type="button"
            onClick={resendEmail}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Resend
          </button>
        </div>
      )}
      {field === "email" && emailMsg && (
        <p className="mt-2 text-sm text-slate-600">{emailMsg}</p>
      )}

      {/* Phone verification lane */}
      {field === "phone" && isEditing && phonePending && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="w-full sm:w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 tracking-widest outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#E72B69]/25 focus:border-[#E72B69]/40"
            placeholder="6-digit code"
            value={phoneCode}
            onChange={(e) => setPhoneCode(e.target.value)}
            inputMode="numeric"
          />

          <button
            type="button"
            onClick={verifyPhone}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={brandGradient}
          >
            Verify
          </button>

          <button
            type="button"
            onClick={resendPhone}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Resend
          </button>
        </div>
      )}
      {field === "phone" && phoneMsg && (
        <p className="mt-2 text-sm text-slate-600">{phoneMsg}</p>
      )}
    </div>
  );
}
