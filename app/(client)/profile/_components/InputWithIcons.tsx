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

  return (
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!isEditing}
        className={`border w-full rounded-lg p-2 pr-16 ${
          isEditing ? "" : "bg-gray-50"
        }`}
      />

      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={onSaveClick}
              title="Save"
              className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => toggle(field, false)}
              title="Cancel"
              className="p-1 rounded hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => toggle(field, true)}
            title="Edit"
            className="p-1 rounded hover:bg-gray-100"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Email verification lane */}
      {field === "email" && isEditing && emailPending && (
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <input
            className="border p-2 rounded w-40 tracking-widest"
            placeholder="6-digit code"
            value={emailCode}
            onChange={(e) => setEmailCode(e.target.value)}
          />
          <button
            type="button"
            onClick={verifyEmail}
            className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-500"
          >
            Verify
          </button>
          <button
            type="button"
            onClick={resendEmail}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Resend
          </button>
        </div>
      )}
      {field === "email" && emailMsg && (
        <p className="mt-1 text-sm text-gray-700">{emailMsg}</p>
      )}

      {/* Phone verification lane */}
      {field === "phone" && isEditing && phonePending && (
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <input
            className="border p-2 rounded w-40 tracking-widest"
            placeholder="6-digit code"
            value={phoneCode}
            onChange={(e) => setPhoneCode(e.target.value)}
          />
          <button
            type="button"
            onClick={verifyPhone}
            className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-500"
          >
            Verify
          </button>
          <button
            type="button"
            onClick={resendPhone}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Resend
          </button>
        </div>
      )}
      {field === "phone" && phoneMsg && (
        <p className="mt-1 text-sm text-gray-700">{phoneMsg}</p>
      )}
    </div>
  );
}
