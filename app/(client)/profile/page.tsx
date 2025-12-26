// app/(client)/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { configureAmplify } from "@/lib/amplifyClient";
import {
  updateUserAttributes,
  confirmUserAttribute,
  sendUserAttributeVerificationCode,
  getCurrentUser,
  fetchUserAttributes,
} from "aws-amplify/auth";

import InputWithIcons, { EditKeys } from "./_components/InputWithIcons";
import AddressSection from "./_components/AddressSection";
import FilingStatusSection from "./_components/FilingStatusSection";
import PasswordSection from "./_components/PasswordSection";

configureAmplify();

type FilingStatus =
  | ""
  | "Single"
  | "Married Filing Jointly"
  | "Married Filing Separately"
  | "Head of Household"
  | "Qualifying Widow(er)";

type FormState = {
  name: string;
  dob: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  filingStatus: FilingStatus;
};

function toE164US(phoneRaw: string) {
  const digits = phoneRaw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return phoneRaw.startsWith("+") ? phoneRaw : `+${digits}`;
}

export default function ProfilePage() {
  const initialForm: FormState = useMemo(
    () => ({
      name: "",
      dob: "",
      email: "",
      phone: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      filingStatus: "",
    }),
    []
  );

  const [form, setForm] = useState<FormState>(initialForm);
  const [snap, setSnap] = useState<FormState>(initialForm);

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

  const [emailPending, setEmailPending] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [emailCode, setEmailCode] = useState("");

  const [phonePending, setPhonePending] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");
  const [phoneCode, setPhoneCode] = useState("");

  const [editFiling, setEditFiling] = useState(false);
  const [editAddress, setEditAddress] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cu = await getCurrentUser().catch(() => null);
        if (!cu) return;

        const attrs = await fetchUserAttributes().catch(
          () => ({}) as Record<string, string>
        );

        const tokenEmail = (attrs.email ?? "").toLowerCase();

        // ✅ Ensure DB user shell exists (helps first-time users)
        if (tokenEmail) {
          await fetch("/api/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cognitoSub: cu.userId, email: tokenEmail }),
          }).catch(() => null);
        }

        const res = await fetch("/api/profile", { cache: "no-store" });
        const data: Partial<FormState> = res.ok ? await res.json() : {};

        const next: FormState = {
          name: data.name ?? (attrs.name ?? ""),
          dob: data.dob ?? (attrs.birthdate ?? ""),
          email: data.email ?? (attrs.email ?? ""),
          phone: data.phone ?? (attrs.phone_number ?? ""),
          address1: data.address1 ?? "",
          address2: data.address2 ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          zip: data.zip ?? "",
          filingStatus: (data.filingStatus ?? "") as FilingStatus,
        };

        setForm(next);
        setSnap(next);
      } catch {
        // optional toast
      }
    })();
  }, [initialForm]);

  function toggle(field: EditKeys, on = true) {
    setEdit((e) => ({ ...e, [field]: on }));

    if (on === false) {
      setForm((f) => ({ ...f, [field]: snap[field] as never }));

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

  async function patchProfile(partial: Partial<FormState>) {
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

  // ---------- EMAIL ----------
  async function saveEmail() {
    try {
      setEmailMsg("");
      const email = form.email.trim().toLowerCase();
      if (!email) {
        setEmailMsg("Email is required.");
        return;
      }

      await updateUserAttributes({ userAttributes: { email } });
      setEmailPending(true);
      setEmailMsg("We sent a 6-digit code to your new email.");
    } catch (e: unknown) {
      setEmailMsg(e instanceof Error ? e.message : "Could not update email.");
    }
  }

  async function verifyEmail() {
    try {
      await confirmUserAttribute({
        userAttributeKey: "email",
        confirmationCode: emailCode,
      });

      // ✅ mirror to DB after verification
      await patchProfile({ email: form.email });

      setEmailPending(false);
      setEmailCode("");
      setEmailMsg("Email verified ✅");
      toggle("email", false);
    } catch (e: unknown) {
      setEmailMsg(e instanceof Error ? e.message : "Verification failed.");
    }
  }

  async function resendEmail() {
    try {
      await sendUserAttributeVerificationCode({ userAttributeKey: "email" });
      setEmailMsg("Code resent.");
    } catch (e: unknown) {
      setEmailMsg(e instanceof Error ? e.message : "Could not resend code.");
    }
  }

  // ---------- PHONE ----------
  async function savePhone() {
    try {
      setPhoneMsg("");
      const normalized = toE164US(form.phone.trim());
      if (!normalized) {
        setPhoneMsg("Phone is required.");
        return;
      }

      await updateUserAttributes({
        userAttributes: { phone_number: normalized },
      });

      setPhonePending(true);
      setPhoneMsg("We sent a 6-digit code by SMS.");
      setForm((f) => ({ ...f, phone: normalized }));
    } catch (e: unknown) {
      setPhoneMsg(e instanceof Error ? e.message : "Could not update phone.");
    }
  }

  async function verifyPhone() {
    try {
      await confirmUserAttribute({
        userAttributeKey: "phone_number",
        confirmationCode: phoneCode,
      });

      // ✅ mirror to DB after verification
      await patchProfile({ phone: form.phone });

      setPhonePending(false);
      setPhoneCode("");
      setPhoneMsg("Phone verified ✅");
      toggle("phone", false);
    } catch (e: unknown) {
      setPhoneMsg(e instanceof Error ? e.message : "Verification failed.");
    }
  }

  async function resendPhone() {
    try {
      await sendUserAttributeVerificationCode({
        userAttributeKey: "phone_number",
      });
      setPhoneMsg("Code resent.");
    } catch (e: unknown) {
      setPhoneMsg(e instanceof Error ? e.message : "Could not resend code.");
    }
  }

  // ---------- ADDRESS (block save) ----------
  async function saveAddressBlock() {
    const body = {
      address1: form.address1,
      address2: form.address2,
      city: form.city,
      state: form.state.toUpperCase().slice(0, 2),
      zip: form.zip.replace(/[^0-9\-]/g, ""),
    };

    const ok = await patchProfile(body);
    if (ok) setEditAddress(false);
  }

  // ---------- FILING STATUS (block save) ----------
  async function saveFiling() {
    const ok = await patchProfile({ filingStatus: form.filingStatus });
    if (ok) setEditFiling(false);
  }

  // ---------- Address single-field save ----------
  async function saveAddressField(field: EditKeys) {
    if (
      field !== "address1" &&
      field !== "address2" &&
      field !== "city" &&
      field !== "state" &&
      field !== "zip"
    ) {
      return;
    }

    let value = (form[field] ?? "") as string;
    if (field === "state") value = value.toUpperCase().slice(0, 2);
    if (field === "zip") value = value.replace(/[^0-9\-]/g, "");

    const ok = await patchProfile({ [field]: value } as Partial<FormState>);
    if (ok) toggle(field, false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl bg-white p-6 rounded-2xl shadow-sm space-y-6">
        <h1 className="text-2xl font-bold text-blue-900">Account Settings</h1>

        {/* Read-only identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Full name</label>
            <input
              className="border p-2 rounded w-full bg-gray-50"
              value={form.name}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Date of birth</label>
            <input
              className="border p-2 rounded w-full bg-gray-50"
              value={form.dob}
              readOnly
            />
          </div>
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <InputWithIcons
              field="email"
              type="email"
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              edit={edit}
              toggle={toggle}
              saveEmail={saveEmail}
              savePhone={savePhone}
              saveAddressField={saveAddressField}
              emailPending={emailPending}
              emailCode={emailCode}
              setEmailCode={setEmailCode}
              emailMsg={emailMsg}
              verifyEmail={verifyEmail}
              resendEmail={resendEmail}
              phonePending={phonePending}
              phoneCode={phoneCode}
              setPhoneCode={setPhoneCode}
              phoneMsg={phoneMsg}
              verifyPhone={verifyPhone}
              resendPhone={resendPhone}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Phone</label>
            <InputWithIcons
              field="phone"
              type="tel"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              edit={edit}
              toggle={toggle}
              saveEmail={saveEmail}
              savePhone={savePhone}
              saveAddressField={saveAddressField}
              emailPending={emailPending}
              emailCode={emailCode}
              setEmailCode={setEmailCode}
              emailMsg={emailMsg}
              verifyEmail={verifyEmail}
              resendEmail={resendEmail}
              phonePending={phonePending}
              phoneCode={phoneCode}
              setPhoneCode={setPhoneCode}
              phoneMsg={phoneMsg}
              verifyPhone={verifyPhone}
              resendPhone={resendPhone}
            />
          </div>
        </div>

        {/* Address (block) */}
        <AddressSection
          form={{
            address1: form.address1,
            address2: form.address2,
            city: form.city,
            state: form.state,
            zip: form.zip,
          }}
          setForm={(updater) =>
            setForm((prev) => {
              const next =
                typeof updater === "function"
                  ? updater({
                      address1: prev.address1,
                      address2: prev.address2,
                      city: prev.city,
                      state: prev.state,
                      zip: prev.zip,
                    })
                  : updater;

              return { ...prev, ...next };
            })
          }
          snap={{
            address1: snap.address1,
            address2: snap.address2,
            city: snap.city,
            state: snap.state,
            zip: snap.zip,
          }}
          editAddress={editAddress}
          setEditAddress={setEditAddress}
          onSave={saveAddressBlock}
        />

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FilingStatusSection
            editFiling={editFiling}
            setEditFiling={setEditFiling}
            filingStatus={form.filingStatus}
            setFilingStatus={(v) => setForm((f) => ({ ...f, filingStatus: v }))}
            snapFilingStatus={snap.filingStatus}
            onSave={saveFiling}
          />

          <PasswordSection />
        </div>
      </div>
    </div>
  );
}
