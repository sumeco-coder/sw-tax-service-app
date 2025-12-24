// app(client)/profile/_components/PasswordSection.tsx
"use client";

import React, { useState } from "react";
import { updatePassword } from "aws-amplify/auth";
import { Pencil, Check, X } from "lucide-react";

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
    <section>
      <label className="block text-sm text-gray-600 mb-1">Change Password</label>

      {!editPassword && (
        <div className="relative inline-block w-full max-w-xs">
          <input className="border w-full rounded-lg p-2 pr-10 bg-gray-50" value="••••••••" readOnly />
          <button
            type="button"
            onClick={() => {
              setEditPassword(true);
              setPwMsg("");
            }}
            title="Edit password"
            className="absolute inset-y-0 right-2 my-auto p-1 rounded hover:bg-gray-100"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      )}

      {editPassword && (
        <div className="relative inline-block w-full max-w-xs">
          <div className="space-y-2 pr-20">
            <input
              type="password"
              placeholder="Current password"
              className="border w-full rounded-lg p-2"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              autoComplete="current-password"
            />
            <input
              type="password"
              placeholder="New password"
              className="border w-full rounded-lg p-2"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              className="border w-full rounded-lg p-2"
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
              className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
            >
              <Check className="w-4 h-4" />
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
              className="p-1 rounded hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {pwMsg && <p className="mt-2 text-sm text-gray-700">{pwMsg}</p>}
        </div>
      )}
    </section>
  );
}
