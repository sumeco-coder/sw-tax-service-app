// app/(client)/profile/_components/PasswordSection.tsx
"use client";

import React, { useState } from "react";
import { updatePassword } from "aws-amplify/auth";
import { Pencil, Check, X } from "lucide-react";

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
};

function getErrMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "Password change failed.";
}

export default function PasswordSection() {
  const [editPassword, setEditPassword] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const brandGradient = {
    background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition " +
    "focus:ring-2 focus:ring-[#E72B69]/25 focus:border-[#E72B69]/40";

  async function savePassword() {
    setPwMsg("");
    if (!oldPw || !newPw) return setPwMsg("Enter current and new password.");
    if (newPw !== confirmPw) return setPwMsg("New passwords don’t match.");

    try {
      await updatePassword({ oldPassword: oldPw, newPassword: newPw });
      setPwMsg("Password updated ✅");
      setEditPassword(false);
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e: unknown) {
      setPwMsg(getErrMsg(e));
    }
  }

  return (
    <section className="text-slate-900">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Change Password
      </label>

      {!editPassword ? (
        <div className="relative w-full max-w-sm">
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-12 text-sm text-slate-900 disabled:opacity-100"
            value="••••••••"
            readOnly
          />
          <button
            type="button"
            onClick={() => {
              setEditPassword(true);
              setPwMsg("");
            }}
            title="Edit password"
            className="absolute inset-y-0 right-2 my-auto rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative w-full max-w-sm">
          <div className="space-y-2 pr-20">
            <input
              type="password"
              placeholder="Current password"
              className={inputClass}
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              autoComplete="current-password"
            />
            <input
              type="password"
              placeholder="New password"
              className={inputClass}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              className={inputClass}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="absolute top-2 right-2 flex items-start gap-1">
            <button
              type="button"
              onClick={savePassword}
              title="Save"
              className="rounded-lg p-1.5 text-white shadow-sm hover:opacity-90"
              style={brandGradient}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditPassword(false);
                setOldPw("");
                setNewPw("");
                setConfirmPw("");
                setPwMsg("");
              }}
              title="Cancel"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {pwMsg && <p className="mt-2 text-sm text-slate-600">{pwMsg}</p>}
        </div>
      )}
    </section>
  );
}
