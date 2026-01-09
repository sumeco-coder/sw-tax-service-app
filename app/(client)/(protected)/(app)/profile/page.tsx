// app/(client)/(protected)/(app)/profile/page.tsx
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
import Identity, { IdentityView } from "./_components/Identity";
import SsnSection from "./_components/SsnSection";

configureAmplify();

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
};

type FilingStatus =
  | ""
  | "Single"
  | "Married Filing Jointly"
  | "Married Filing Separately"
  | "Head of Household"
  | "Qualifying Widow(er)";

type FormState = {
  // Identity (read-only in portal)
  firstName: string;
  middleName: string; // store middle name, show initial in UI
  lastName: string;
  dob: string; // YYYY-MM-DD

  email: string;
  phone: string;

  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;

  filingStatus: FilingStatus;

  ssnLast4: string;
};

function toE164US(phoneRaw: string) {
  const digits = phoneRaw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return phoneRaw.startsWith("+") ? phoneRaw : `+${digits}`;
}

function toYMD(v: unknown) {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export default function ProfilePage() {
  const initialForm: FormState = useMemo(
    () => ({
      firstName: "",
      middleName: "",
      lastName: "",
      dob: "",

      email: "",
      phone: "",

      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",

      filingStatus: "",

      ssnLast4: "",
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

        // ✅ Ensure DB user shell exists
        if (tokenEmail) {
          await fetch("/api/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cognitoSub: cu.userId, email: tokenEmail }),
          }).catch(() => null);
        }

        const res = await fetch("/api/profile", { cache: "no-store" });
        const data: any = res.ok ? await res.json() : {};

        const next: FormState = {
          firstName: String(data.firstName ?? ""),
          middleName: String(data.middleName ?? ""),
          lastName: String(data.lastName ?? ""),
          dob: toYMD(data.dob ?? attrs.birthdate ?? ""),

          email: String(data.email ?? attrs.email ?? ""),
          phone: String(data.phone ?? attrs.phone_number ?? ""),

          address1: String(data.address1 ?? ""),
          address2: String(data.address2 ?? ""),
          city: String(data.city ?? ""),
          state: String(data.state ?? ""),
          zip: String(data.zip ?? ""),

          filingStatus: (data.filingStatus ?? "") as FilingStatus,

          ssnLast4: String(data.ssnLast4 ?? ""),
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
      if (!email) return setEmailMsg("Email is required.");

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
      if (!normalized) return setPhoneMsg("Phone is required.");

      await updateUserAttributes({ userAttributes: { phone_number: normalized } });

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
      await sendUserAttributeVerificationCode({ userAttributeKey: "phone_number" });
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
      state: (form.state ?? "").toUpperCase().slice(0, 2),
      zip: form.zip.replace(/[^0-9\-]/g, ""),
    };

    const ok = await patchProfile(body);
    if (ok) setEditAddress(false);
  }

  // ---------- FILING STATUS ----------
  async function saveFiling() {
    const ok = await patchProfile({ filingStatus: form.filingStatus });
    if (ok) setEditFiling(false);
  }

  async function saveAddressField(field: EditKeys) {
    if (!["address1", "address2", "city", "state", "zip"].includes(field)) return;

    let value = (form[field] ?? "") as string;
    if (field === "state") value = value.toUpperCase().slice(0, 2);
    if (field === "zip") value = value.replace(/[^0-9\-]/g, "");

    const ok = await patchProfile({ [field]: value } as Partial<FormState>);
    if (ok) toggle(field, false);
  }

  const brandBar = {
    background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
  };

  const identityView: IdentityView = {
    firstName: form.firstName,
    middleInitial: (form.middleName || "").trim().slice(0, 1).toUpperCase(),
    lastName: form.lastName,
    dob: form.dob,
  };

  return (
    <div className="p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Account Settings
          </h1>
          <div className="mt-2 h-1 w-28 rounded-full" style={brandBar} />
          <p className="mt-3 text-sm text-slate-600">
            Manage your contact info and profile details.
          </p>
        </div>

        <Identity identity={identityView} />

        <SsnSection
          ssnLast4={form.ssnLast4}
          onSaved={(last4) => {
            setForm((f) => ({ ...f, ssnLast4: last4 }));
            setSnap((s) => ({ ...s, ssnLast4: last4 }));
          }}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-900">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-900">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Phone
            </label>
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-900">
            <FilingStatusSection
              editFiling={editFiling}
              setEditFiling={setEditFiling}
              filingStatus={form.filingStatus}
              setFilingStatus={(v) => setForm((f) => ({ ...f, filingStatus: v }))}
              snapFilingStatus={snap.filingStatus}
              onSave={saveFiling}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-900">
            <PasswordSection />
          </div>
        </div>
      </div>
    </div>
  );
}
