"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import { saveProfile } from "./actions";

configureAmplify();

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

        // Fallback to loginId if no email in token
        const email =
          tokenEmail || (u.signInDetails?.loginId as string | undefined) || "";

        console.log("CURRENT USER:", u);
        console.log("ID TOKEN PAYLOAD:", idTokenPayload);
        console.log("FINAL EMAIL USED:", email);

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
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading your profile…</p>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl bg-white p-6 shadow">
          <h1 className="text-lg font-semibold text-slate-900">
            Sign in required
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {error ??
              "We couldn’t find your session. Please sign in again to continue onboarding."}
          </p>
          <a
            href="/sign-in"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Go to sign-in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Step 1 of 4
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Confirm your details
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            We’ll use this information on your tax return and to keep you
            updated about your file.
          </p>
        </header>

        <form action={saveProfile} className="space-y-4">
          {/* hidden fields for the server action */}
          <input type="hidden" name="cognitoSub" value={user.sub} />
          <input type="hidden" name="email" value={user.email} />

          {/* Email (locked) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
            <p className="mt-1 text-xs text-slate-500">
              Email is locked to the account you used to sign up.
            </p>
          </div>

          {/* Legal name */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Legal name</h2>
            <p className="mt-1 text-xs text-slate-500">
              Enter your name exactly as it appears on your Social Security
              card.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  First name
                </label>
                <input
                  name="firstName"
                  required
                  defaultValue={user.firstName ?? ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Last name
                </label>
                <input
                  name="lastName"
                  required
                  defaultValue={user.lastName ?? ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Suffix (optional)
                </label>
                <select
                  name="suffix"
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
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
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Contact & address
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              This should be your current mailing address for IRS/state notices.
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Mobile phone
                </label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  We’ll only use this for appointment reminders and important
                  updates.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Address line 1
                </label>
                <input
                  name="address1"
                  type="text"
                  required
                  placeholder="Street address"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Address line 2 (optional)
                </label>
                <input
                  name="address2"
                  type="text"
                  placeholder="Apt, suite, unit, etc."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    City
                  </label>
                  <input
                    name="city"
                    type="text"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    State
                  </label>
                  <select
                    name="state"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    ZIP code
                  </label>
                  <input
                    name="zip"
                    type="text"
                    inputMode="numeric"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DOB + SSN */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Date of birth
              </label>
              <input
                type="date"
                name="dob"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Social Security Number
              </label>
              <input
                type="text"
                name="ssn"
                inputMode="numeric"
                maxLength={11}
                placeholder="XXX-XX-XXXX"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                You can leave this blank and provide it over the phone if you
                prefer.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-500">
              You can update this information later if something changes.
            </p>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Save and continue to documents
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
