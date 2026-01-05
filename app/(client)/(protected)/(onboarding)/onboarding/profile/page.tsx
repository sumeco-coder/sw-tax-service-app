// app/(client)/onboarding/profile/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import { saveProfile } from "./actions";
import { Eye, EyeOff } from "lucide-react";

configureAmplify();

function formatUSPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 10);

  if (digits.length <= 3) return a ? `(${a}` : "";
  if (digits.length <= 6) return `(${a}) ${b}`;
  return `(${a}) ${b}-${c}`;
}

function formatSSN(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 5);
  const c = digits.slice(5, 9);

  if (digits.length <= 3) return a;
  if (digits.length <= 5) return `${a}-${b}`;
  return `${a}-${b}-${c}`;
}

type UserIdentity = {
  sub: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

export default function OnboardingProfilePage() {
  const [ssn, setSsn] = React.useState("");
  const [showSsn, setShowSsn] = React.useState(false);
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        const session = await fetchAuthSession();

        const idTokenPayload = session.tokens?.idToken?.payload ?? {};

        const tokenEmail =
          (idTokenPayload["email"] as string | undefined) ?? "";
        const givenName =
          (idTokenPayload["given_name"] as string | undefined) ?? "";
        const familyName =
          (idTokenPayload["family_name"] as string | undefined) ?? "";
        const phoneNumber =
          (idTokenPayload["phone_number"] as string | undefined) ?? "";

        const email =
          tokenEmail || (u.signInDetails?.loginId as string | undefined) || "";

        setUser({
          sub: u.userId,
          email,
          firstName: givenName || undefined,
          lastName: familyName || undefined,
          phone: phoneNumber || undefined,
        });
      } catch (err) {
        console.error(err);
        setError("You must be signed in to access onboarding.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your profile…</p>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
          <h1 className="text-lg font-semibold text-foreground">
            Sign in required
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ??
              "We couldn’t find your session. Please sign in again to continue onboarding."}
          </p>
          <a
            href="/sign-in"
            className="mt-4 inline-flex w-full justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Go to sign-in
          </a>
        </div>
      </main>
    );
  }

  const inputBase =
    "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring";
  const labelBase = "mb-1 block text-sm font-medium text-foreground";
  const helpBase = "mt-1 text-xs text-muted-foreground";

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Step 1 of 5
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Confirm your details
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We’ll use this information on your tax return and to keep you
            updated about your file.
          </p>
        </header>

        <form action={saveProfile} className="space-y-6">

          {/* Email (locked) */}
          <div>
            <label className={labelBase}>Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-xl border border-input bg-muted px-3 py-2 text-sm text-foreground/80"
            />
            <p className={helpBase}>Email is locked to the account you used.</p>
          </div>

          {/* Legal name */}
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Legal name
              </h2>
              <p className={helpBase}>
                Enter your name exactly as it appears on your Social Security
                card.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-foreground">
                  First name <span className="text-destructive">*</span>
                </label>
                <input
                  name="firstName"
                  required
                  defaultValue={user.firstName ?? ""}
                  className={inputBase}
                />
              </div>

              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Middle name
                </label>
                <input
                  name="middleName"
                  defaultValue=""
                  className={inputBase}
                  placeholder="Optional"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Last name <span className="text-destructive">*</span>
                </label>
                <input
                  name="lastName"
                  required
                  defaultValue={user.lastName ?? ""}
                  className={inputBase}
                />
              </div>

              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Suffix
                </label>
                <select name="suffix" defaultValue="" className={inputBase}>
                  <option value="">None</option>
                  <option value="Jr">Jr</option>
                  <option value="Sr">Sr</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact & address */}
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Contact & address
              </h2>
              <p className={helpBase}>
                This should be your current mailing address for IRS/state
                notices.
              </p>
            </div>

            <div>
              <label className={labelBase}>
                Mobile phone <span className="text-destructive">*</span>
              </label>
              <input
                name="phone"
                type="tel"
                required
                defaultValue={user.phone ?? ""}
                placeholder="(555) 555-5555"
                className={inputBase}
                inputMode="numeric"
                autoComplete="tel"
                onInput={(e) => {
                  const el = e.currentTarget;
                  const formatted = formatUSPhone(el.value);
                  el.value = formatted;
                }}
              />

              <p className={helpBase}>
                Used for appointment reminders and important updates.
              </p>
            </div>

            <div>
              <label className={labelBase}>
                Address line 1 <span className="text-destructive">*</span>
              </label>
              <input
                name="address1"
                type="text"
                required
                placeholder="Street address"
                className={inputBase}
              />
            </div>

            <div>
              <label className={labelBase}>Address line 2</label>
              <input
                name="address2"
                type="text"
                placeholder="Apt, suite, unit, etc. (optional)"
                className={inputBase}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelBase}>
                  City <span className="text-destructive">*</span>
                </label>
                <input name="city" type="text" required className={inputBase} />
              </div>

              <div>
                <label className={labelBase}>
                  State <span className="text-destructive">*</span>
                </label>
                <select
                  name="state"
                  required
                  defaultValue=""
                  className={inputBase}
                >
                  <option value="" disabled>
                    Select state
                  </option>
                  {US_STATES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.value} – {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelBase}>
                  ZIP code <span className="text-destructive">*</span>
                </label>
                <input
                  name="zip"
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="12345"
                  className={inputBase}
                />
              </div>
            </div>
          </div>

          {/* DOB + SSN */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Date of birth <span className="text-destructive">*</span>
              </label>
              <input type="date" name="dob" required className={inputBase} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Social Security Number
              </label>
              <div className="relative">
  <input
    type={showSsn ? "text" : "password"}
    name="ssn"
    inputMode="numeric"
    maxLength={11}
    placeholder="XXX-XX-XXXX"
    className={`${inputBase} pr-11`}
    value={ssn}
    onChange={(e) => setSsn(formatSSN(e.target.value))}
    autoComplete="off"
  />

  <button
    type="button"
    onClick={() => setShowSsn((v) => !v)}
    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    aria-label={showSsn ? "Hide SSN" : "Show SSN"}
  >
    {showSsn ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
  </button>
</div>

              <p className="mt-1 text-[11px] text-muted-foreground">
                Optional — you can provide this over the phone if you prefer.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
            <p className="text-[11px] text-muted-foreground">
              You can update this information later if something changes.
            </p>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
            >
              Save and continue to documents
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
