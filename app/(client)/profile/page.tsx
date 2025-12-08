"use client";

import React, { useEffect, useState } from "react";
import { configureAmplify } from "@/lib/amplifyClient";
import { updatePassword } from "aws-amplify/auth";

import {
  updateUserAttributes,
  confirmUserAttribute,
  sendUserAttributeVerificationCode,
  getCurrentUser,
  fetchUserAttributes,
} from "aws-amplify/auth";
import { Pencil, Check, X } from "lucide-react";

configureAmplify();

type FilingStatus =
  | ""
  | "Single"
  | "Married Filing Jointly"
  | "Married Filing Separately"
  | "Head of Household"
  | "Qualifying Widow(er)";

type EditKeys =
  | "email"
  | "phone"
  | "address1"
  | "address2"
  | "city"
  | "state"
  | "zip"
  | "filingStatus";

export default function ProfilePage() {
  const [form, setForm] = useState({
    name: "",
    dob: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    filingStatus: "" as FilingStatus,
  });

  // Snapshot for canceling
  const [snap, setSnap] = useState({ ...form });

  // ADD this near your other state flags
  

  

  // Per-field edit toggles
  const [edit, setEdit] = useState<Record<EditKeys, boolean>>({
    email: false,
    phone: false,
    address1: false,
    address2: false,
    city: false,
    state: false,
    zip: false,
    filingStatus: false,
  });

  // Email/phone verification flows
  const [emailPending, setEmailPending] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [editFiling, setEditFiling] = useState(false);
  const [editAddress, setEditAddress] = useState(false);
  const [phonePending, setPhonePending] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [editPassword, setEditPassword] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        await getCurrentUser().catch(() => null);
        const attrs = await fetchUserAttributes().catch(() => ({}) as any);
        const res = await fetch("/api/profile", { cache: "no-store" });
        const data = res.ok ? await res.json() : {};

        const next = {
          name: data.name ?? attrs.name ?? "",
          dob: data.dob ?? attrs.birthdate ?? "",
          email: data.email ?? attrs.email ?? "",
          phone: data.phone ?? attrs.phone_number ?? "",
          address1: data.address1 ?? "",
          address2: data.address2 ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          zip: data.zip ?? "",
          filingStatus: (data.filingStatus ?? "") as FilingStatus,
        };
        setForm(next);
        setSnap(next);
      } catch {}
    })();
  }, []);

  function toggle(field: EditKeys, on = true) {
    setEdit((e) => ({ ...e, [field]: on }));
    if (on === false) {
      // cancel -> revert field to snapshot
      setForm((f) => ({ ...f, [field]: (snap as any)[field] }));
      if (field === "email") {
        setEmailPending(false);
        setEmailMsg("");
        setEmailCode("");
      }
      if (field === "phone") {
        setPhonePending(false);
        setPhoneMsg("");
        setPhoneCode("");
      }
    }
  }

  async function saveAddressBlock() {
    const body = {
      address1: form.address1,
      address2: form.address2,
      city: form.city,
      state: form.state.toUpperCase().slice(0, 2),
      zip: form.zip.replace(/[^0-9\-]/g, ""),
    };

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSnap((s) => ({ ...s, ...body }));
      setEditAddress(false);
    } else {
      // optionally show a toast
    }
  }

  async function patchProfile(partial: Partial<typeof form>) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    if (res.ok) {
      setSnap((s) => ({ ...s, ...partial }));
      return true;
    }
    return false;
  }

  // EMAIL
  async function saveEmail() {
    try {
      setEmailMsg("");
      await updateUserAttributes({ userAttributes: { email: form.email } });
      setEmailPending(true);
      setEmailMsg("We sent a 6-digit code to your new email.");
    } catch (e: any) {
      setEmailMsg(e?.message || "Could not update email.");
    }
  }
  async function verifyEmail() {
    try {
      await confirmUserAttribute({
        userAttributeKey: "email",
        confirmationCode: emailCode,
      });
      setEmailPending(false);
      setEmailCode("");
      setEmailMsg("Email verified ✅");
      setSnap((s) => ({ ...s, email: form.email }));
      toggle("email", false);
    } catch (e: any) {
      setEmailMsg(e?.message || "Verification failed.");
    }
  }
  async function resendEmail() {
    try {
      await sendUserAttributeVerificationCode({ userAttributeKey: "email" });
      setEmailMsg("Code resent.");
    } catch (e: any) {
      setEmailMsg(e?.message || "Could not resend code.");
    }
  }

  async function savePassword() {
  setPwMsg("");
  if (!oldPw || !newPw) return setPwMsg("Enter current and new password.");
  if (newPw !== confirmPw) return setPwMsg("New passwords don’t match.");
  try {
    await updatePassword({ oldPassword: oldPw, newPassword: newPw });
    setPwMsg("Password updated ✅");
    setEditPassword(false);
    setOldPw(""); setNewPw(""); setConfirmPw("");
  } catch (e: any) {
    setPwMsg(e?.message || "Password change failed.");
  }
}


  // PHONE
  async function savePhone() {
    try {
      setPhoneMsg("");
      let phone = form.phone.trim();
      if (!phone.startsWith("+1")) phone = "+1" + phone.replace(/\D/g, "");
      await updateUserAttributes({ userAttributes: { phone_number: phone } });
      setPhonePending(true);
      setPhoneMsg("We sent a 6-digit code by SMS.");
      setForm((f) => ({ ...f, phone })); // normalize to E.164
    } catch (e: any) {
      setPhoneMsg(e?.message || "Could not update phone.");
    }
  }
  async function verifyPhone() {
    try {
      await confirmUserAttribute({
        userAttributeKey: "phone_number",
        confirmationCode: phoneCode,
      });
      setPhonePending(false);
      setPhoneCode("");
      setPhoneMsg("Phone verified ✅");
      setSnap((s) => ({ ...s, phone: form.phone }));
      toggle("phone", false);
    } catch (e: any) {
      setPhoneMsg(e?.message || "Verification failed.");
    }
  }
  async function resendPhone() {
    try {
      await sendUserAttributeVerificationCode({
        userAttributeKey: "phone_number",
      });
      setPhoneMsg("Code resent.");
    } catch (e: any) {
      setPhoneMsg(e?.message || "Could not resend code.");
    }
  }

  // save handler (reuse your existing saveFiling or paste this)
  async function saveFiling() {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filingStatus: form.filingStatus }),
    });
    if (res.ok) {
      setSnap((s) => ({ ...s, filingStatus: form.filingStatus }));
      setEditFiling(false);
    } else {
      // optional: toast/error
    }
  }

  // ADDRESS single-field saves
  async function saveAddressField(field: EditKeys) {
    let value = (form as any)[field] as string;
    if (field === "state") value = value.toUpperCase().slice(0, 2);
    if (field === "zip") value = value.replace(/[^0-9\-]/g, "");
    const ok = await patchProfile({ [field]: value } as any);
    if (ok) toggle(field, false);
  }

  // FILING STATUS
  async function saveFilingStatus() {
    const ok = await patchProfile({ filingStatus: form.filingStatus });
    if (ok) toggle("filingStatus", false);
  }

  // Helper UI: input with icon(s) inside
  function InputWithIcons(props: {
    field: EditKeys;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
  }) {
    const { field, type = "text", placeholder, value, onChange } = props;
    const isEditing = edit[field];
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
                onClick={() =>
                  field === "email"
                    ? emailPending
                      ? undefined
                      : saveEmail()
                    : field === "phone"
                      ? phonePending
                        ? undefined
                        : savePhone()
                      : saveAddressField(field)
                }
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
        {/* Inline verify lanes for email/phone */}
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl bg-white p-6 rounded-2xl shadow-sm space-y-6">
        <h1 className="text-2xl font-bold text-blue-900">Account Settings</h1>

        {/* Read-only identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Full name
            </label>
            <input
              className="border p-2 rounded w-full bg-gray-50"
              value={form.name}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Date of birth
            </label>
            <input
              className="border p-2 rounded w-full bg-gray-50"
              value={form.dob}
              readOnly
            />
          </div>
        </div>

        {/* Email + Phone (pens inside) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <InputWithIcons
              field="email"
              type="email"
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Phone</label>
            <InputWithIcons
              field="phone"
              type="tel"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            />
          </div>
        </div>

        {/* ADDRESS (single column, one pen controls all) */}
        <section className="mt-6 border rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Address</h2>

          {/* Address line 1 (hosts the pen / save / cancel) */}
          <div className="relative mb-3">
            <label className="block text-sm text-gray-600 mb-1">
              Address line 1
            </label>
            <input
              className={`border w-full rounded-lg p-2 pr-20 ${editAddress ? "" : "bg-gray-50"}`}
              placeholder="Address line 1"
              value={form.address1}
              onChange={(e) =>
                setForm((f) => ({ ...f, address1: e.target.value }))
              }
              disabled={!editAddress}
            />
            <div className="absolute inset-y-7 right-2 flex items-center gap-1">
              {editAddress ? (
                <>
                  <button
                    type="button"
                    onClick={saveAddressBlock}
                    title="Save address"
                    className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        address1: snap.address1,
                        address2: snap.address2,
                        city: snap.city,
                        state: snap.state,
                        zip: snap.zip,
                      }));
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
                    // load snapshot values and enable whole block
                    setForm((f) => ({
                      ...f,
                      address1: snap.address1,
                      address2: snap.address2,
                      city: snap.city,
                      state: snap.state,
                      zip: snap.zip,
                    }));
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
            <label className="block text-sm text-gray-600 mb-1">
              Address line 2
            </label>
            <input
              className={`border w-full rounded-lg p-2 ${editAddress ? "" : "bg-gray-50"}`}
              placeholder="Apt, Suite (optional)"
              value={form.address2}
              onChange={(e) =>
                setForm((f) => ({ ...f, address2: e.target.value }))
              }
              disabled={!editAddress}
            />
          </div>

          {/* City / State / ZIP in one column on mobile, 3-up on desktop if you prefer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">City</label>
              <input
                className={`border w-full rounded-lg p-2 ${editAddress ? "" : "bg-gray-50"}`}
                placeholder="City"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                disabled={!editAddress}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">State</label>
              <input
                className={`border w-full rounded-lg p-2 ${editAddress ? "" : "bg-gray-50"}`}
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
                className={`border w-full rounded-lg p-2 ${editAddress ? "" : "bg-gray-50"}`}
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

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* ---- FILING STATUS ---- */}
          <section>
            <label className="block text-sm text-gray-600 mb-1">
              Filing Status
            </label>

            {/* READ-ONLY VIEW with pen inside */}
            {!editFiling && (
              <div className="relative inline-block w-full max-w-xs">
                <input
                  className="border w-full rounded-lg p-2 pr-12 bg-gray-50"
                  value={snap.filingStatus || ""}
                  placeholder="Not set"
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, filingStatus: snap.filingStatus }));
                    setEditFiling(true);
                  }}
                  title="Edit filing status"
                  className="absolute inset-y-0 right-2 my-auto p-1 rounded hover:bg-gray-100"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* EDIT VIEW: dropdown with ✓/✕ inside */}
            {editFiling && (
              <div className="relative inline-block w-full max-w-xs">
                <select
                  value={form.filingStatus}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      filingStatus: e.target.value as any,
                    }))
                  }
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
                    onClick={async () => {
                      const res = await fetch("/api/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          filingStatus: form.filingStatus,
                        }),
                      });
                      if (res.ok) {
                        setSnap((s) => ({
                          ...s,
                          filingStatus: form.filingStatus,
                        }));
                        setEditFiling(false);
                      }
                    }}
                    title="Save"
                    className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        filingStatus: snap.filingStatus,
                      }));
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

          {/* ---- CHANGE PASSWORD ---- */}
          <section>
            <label className="block text-sm text-gray-600 mb-1">
              Change Password
            </label>

            {/* READ-ONLY SHELL with pen inside */}
            {!editPassword && (
              <div className="relative inline-block w-full max-w-xs">
                <input
                  className="border w-full rounded-lg p-2 pr-10 bg-gray-50"
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
                  className="absolute inset-y-0 right-2 my-auto p-1 rounded hover:bg-gray-100"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* EDITING: three inputs + ✓/✕ inside wrapper */}
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
        </div>
      </div>
    </div>
  );
}
