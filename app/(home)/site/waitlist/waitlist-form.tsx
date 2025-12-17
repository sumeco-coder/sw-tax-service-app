// app/(home)/site/waitlist/waitlist-form.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { joinWaitlist } from "./actions"; // 🔑 use your server action

// Toggle this to switch behavior
const USE_REDIRECT_AFTER_SUBMIT = true; // set to false for in-page success

export default function WaitlistForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false); // used for in-page success

  const tracking = useMemo(() => {
    const pluck = (k: string) => params.get(k) || undefined;
    return {
      agency: pluck("agency"),
      plan: pluck("plan"),
      utm_source: pluck("utm_source"),
      utm_medium: pluck("utm_medium"),
      utm_campaign: pluck("utm_campaign"),
      utm_term: pluck("utm_term"),
      utm_content: pluck("utm_content"),
      ref: pluck("ref"),
    };
  }, [params]);

  const pageSource = useMemo(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const parts = [
      `landing:/waitlist`,
      tracking.agency ? `agency=${tracking.agency}` : "",
      tracking.plan ? `plan=${tracking.plan}` : "",
      tracking.utm_source ? `utm_source=${tracking.utm_source}` : "",
      tracking.utm_medium ? `utm_medium=${tracking.utm_medium}` : "",
      tracking.utm_campaign ? `utm_campaign=${tracking.utm_campaign}` : "",
      tracking.utm_term ? `utm_term=${tracking.utm_term}` : "",
      tracking.utm_content ? `utm_content=${tracking.utm_content}` : "",
      tracking.ref ? `ref=${tracking.ref}` : "",
      url ? `url=${encodeURIComponent(url)}` : "",
    ]
      .filter(Boolean)
      .join("&");
    return parts;
  }, [tracking]);

  function isValidEmail(v: string) {
    return /^\S+@\S+\.\S+$/.test(v);
  }
  function isValidPhone(v: string) {
    return /^[0-9+()\-\s]{7,}$/.test(v);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();
    const phone = String(form.get("phone") || "").trim();
    const contactMethod = String(form.get("contactMethod") || "email");
    const taxYear = Number(form.get("taxYear") || "") || undefined;

    const lastPreparer = String(form.get("lastPreparer") || "").trim();
    const priorTaxReturns = String(form.get("priorTaxReturns") || "").trim();

    const messageRaw = String(form.get("message") || "").trim();

    const hp = String(form.get("_hp") || "");
    if (hp) return; // honeypot

    if (!name) return setError("Please enter your full name.");
    if (!email || !isValidEmail(email))
      return setError("Please enter a valid email address.");
    if (phone && !isValidPhone(phone))
      return setError("Please enter a valid phone number or leave it blank.");

    // Fold extra info into a single notes field (matches your waitlist schema)
    const extras = [
      contactMethod ? `Preferred contact: ${contactMethod}` : "",
      taxYear ? `Tax year: ${taxYear}` : "",
      lastPreparer ? `Last preparer: ${lastPreparer}` : "",
      priorTaxReturns ? `Needs prior-year returns: ${priorTaxReturns}` : "",
      pageSource ? `Source: ${pageSource}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const notes =
      [messageRaw, extras].filter(Boolean).join("\n").trim() || undefined;

    setLoading(true);
    try {
      // 🔑 Save into your Drizzle waitlist table via server action
      await joinWaitlist({
        fullName: name,
        email,
        phone: phone || undefined,
        plan: tracking.plan, // from ?plan=
        notes,
        roleType: "taxpayer", // default role for this form
        // agencyId: if you later map agency slug -> firm UUID, set it here
      });

      if (USE_REDIRECT_AFTER_SUBMIT) {
        router.push("/site/waitlist/thanks");
      } else {
        setOk(true);
        (e.target as HTMLFormElement).reset();
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!error) return;
    const el = document.getElementById("form-error");
    el?.focus();
  }, [error]);

  // In-page success (popup style)
  if (!USE_REDIRECT_AFTER_SUBMIT && ok) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-emerald-900 shadow-md">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />
        <h2 className="text-xl font-semibold">You’re on the list! 🎉</h2>
        <p className="mt-2">
          Thanks for joining the waitlist. We’ll email you as soon as booking
          opens.
        </p>
        <button
          onClick={() => setOk(false)}
          className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-white shadow hover:bg-emerald-700 transition"
        >
          Add another
        </button>
      </div>
    );
  }

  return (
    <section className="relative isolate">
      {/* decorative gradient blobs */}
      <div
        className="pointer-events-none absolute -top-16 -left-10 h-52 w-52 rounded-full bg-blue-300/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-10 h-60 w-60 rounded-full bg-indigo-300/30 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white/80 backdrop-blur p-6 sm:p-8 shadow-xl">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
            <span>✨ Priority Access</span>
            {tracking.plan && (
              <span className="rounded-full bg-white px-2 py-0.5 text-blue-600 shadow-sm">
                Plan: {tracking.plan}
              </span>
            )}
            {tracking.agency && (
              <span className="rounded-full bg-white px-2 py-0.5 text-blue-600 shadow-sm">
                {tracking.agency}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Join the Waitlist
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Be first to book when tax-season slots open. No spam — ever.
          </p>
        </header>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
          {/* Honeypot field */}
          <input
            aria-hidden="true"
            type="text"
            name="_hp"
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          {error && (
            <div
              id="form-error"
              role="alert"
              aria-live="assertive"
              tabIndex={-1}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          {/* Name */}
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Full name *
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {/* user icon */}
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 12c2.8 0 5-2.2 5-5s-2.2-5-5-5-5 2.2-5 5 2.2 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
                </svg>
              </span>
              <input
                name="name"
                required
                placeholder="Jane Doe"
                className="w-full rounded-xl border px-10 py-3 outline-none transition focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email *
              </label>
              <span className="pointer-events-none absolute left-3 top-[42px] text-gray-400">
                {/* mail icon */}
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 13l-12-8h24l-12 8zm-12-6l12 8 12-8v11h-24v-11z" />
                </svg>
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="jane@example.com"
                className="w-full rounded-xl border px-10 py-3 outline-none transition focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone (optional)
              </label>
              <span className="pointer-events-none absolute left-3 top-[42px] text-gray-400">
                {/* phone icon */}
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6.6 10.8c1.2 2.4 3.2 4.4 5.6 5.6l2-2c.3-.3.8-.4 1.2-.2 1 .4 2.1.6 3.2.6.6 0 1 .4 1 1v3.1c0 .6-.4 1-1 1C9.4 20 4 14.6 4 8.4c0-.6.4-1 1-1H8c.6 0 1 .4 1 1 0 1.1.2 2.2.6 3.2.2.4.1.9-.2 1.2l-1.8 2z" />
                </svg>
              </span>
              <input
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(555) 555-5555"
                maxLength={24}
                pattern="^[0-9+()\-\s]{7,}$"
                title="Enter a valid phone number (digits, spaces, +, -, parentheses)"
                className="w-full rounded-xl border px-10 py-3 outline-none transition focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Contact + Year */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Preferred contact
              </label>
              <select
                name="contactMethod"
                defaultValue="email"
                className="w-full rounded-xl border px-3 py-3 outline-none transition focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="phone">Phone Call</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tax year (optional)
              </label>
              <input
                name="taxYear"
                type="number"
                min="2000"
                max="2100"
                placeholder="2024"
                className="w-full rounded-xl border px-3 py-3 outline-none transition focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Extra selects */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Who prepared your taxes last season?
              </label>
              <select
                name="lastPreparer"
                defaultValue="myself"
                className="w-full rounded-xl border px-3 py-3 outline-none transition focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="firm">Tax Professional (another firm)</option>
                <option value="myself">I prepared them myself</option>
                <option value="none">I didn’t file my taxes</option>
                <option value="swts">Tax Professional (SW Tax Service)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Need prior-year tax returns filed?
              </label>
              <select
                name="priorTaxReturns"
                defaultValue="yes"
                className="w-full rounded-xl border px-3 py-3 outline-none transition focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Anything else? (optional)
            </label>
            <textarea
              name="message"
              placeholder="Tell us what you need help with or your preferred dates."
              rows={4}
              className="w-full rounded-xl border px-3 py-3 outline-none transition focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Joining…
              </span>
            ) : (
              "Join the Waitlist"
            )}
          </button>

          <p className="text-center text-xs text-gray-500">
            We respect your time and privacy. No spam.
          </p>
        </form>
      </div>
    </section>
  );
}
