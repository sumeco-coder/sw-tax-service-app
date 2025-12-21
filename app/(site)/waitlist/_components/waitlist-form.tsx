// app/(home)/site/waitlist/waitlist-form.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { joinWaitlist } from "../actions"; // 🔑 your server action

// Toggle this to switch behavior
const USE_REDIRECT_AFTER_SUBMIT = true; // set to false for in-page success

type Tracking = {
  agency?: string;
  plan?: string;

  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;

  gclid?: string;
  fbclid?: string;

  ref?: string; // optional custom param
};

const TRACKING_STORE_KEY = "swts_waitlist_tracking_v1";

function safeTrim(v?: string | null) {
  const s = (v ?? "").trim();
  return s.length ? s : undefined;
}

function isValidEmail(v: string) {
  const email = v.trim();
  if (email.length > 254) return false;
  if (/\s/.test(email)) return false;
  if (email.includes("..")) return false;
  if (email.endsWith(".")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isValidPhone(v: string) {
  const digits = v.replace(/\D/g, "");
  return digits.length === 10;
}

function readStoredTracking(): Tracking {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(TRACKING_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Tracking;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredTracking(next: Tracking) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TRACKING_STORE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export default function WaitlistForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [phoneValue, setPhoneValue] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false); // used for in-page success

  // landing context
  const [landingPath, setLandingPath] = useState<string>("");
  const [referrer, setReferrer] = useState<string>("");

  // 1) Read from URL
  const urlTracking = useMemo<Tracking>(() => {
    const pluck = (k: string) => safeTrim(params.get(k));

    return {
      agency: pluck("agency"),
      plan: pluck("plan"),

      utm_source: pluck("utm_source"),
      utm_medium: pluck("utm_medium"),
      utm_campaign: pluck("utm_campaign"),
      utm_term: pluck("utm_term"),
      utm_content: pluck("utm_content"),

      gclid: pluck("gclid"),
      fbclid: pluck("fbclid"),

      ref: pluck("ref"),
    };
  }, [params]);

  // 2) Merge with sessionStorage (persist UTMs even if query params disappear)
  const tracking = useMemo<Tracking>(() => {
    const stored = readStoredTracking();
    const merged: Tracking = {
      ...stored,
      ...Object.fromEntries(
        Object.entries(urlTracking).filter(([, v]) => !!v)
      ),
    } as Tracking;

    return merged;
  }, [urlTracking]);

  // 3) Persist merged tracking on mount / when params change
  useEffect(() => {
    // only store if we have something meaningful
    const hasAny = Object.values(tracking).some(Boolean);
    if (hasAny) writeStoredTracking(tracking);
  }, [tracking]);

  // 4) Capture landingPath + referrer
  useEffect(() => {
    setLandingPath(window.location.pathname || "");
    setReferrer(document.referrer || "");
  }, []);

  const pageSource = useMemo(() => {
  const url = typeof window !== "undefined" ? window.location.href : "";

  const parts = [
    `landing:${landingPath || "/waitlist"}`,
    tracking.agency ? `agency=${tracking.agency}` : "",
    tracking.plan ? `plan=${tracking.plan}` : "",

    tracking.utm_source ? `utm_source=${tracking.utm_source}` : "",
    tracking.utm_medium ? `utm_medium=${tracking.utm_medium}` : "",
    tracking.utm_campaign ? `utm_campaign=${tracking.utm_campaign}` : "",
    tracking.utm_term ? `utm_term=${tracking.utm_term}` : "",
    tracking.utm_content ? `utm_content=${tracking.utm_content}` : "",

    tracking.gclid ? `gclid=${tracking.gclid}` : "",
    tracking.fbclid ? `fbclid=${tracking.fbclid}` : "",

    tracking.ref ? `ref=${tracking.ref}` : "",
    referrer ? `referrer=${encodeURIComponent(referrer)}` : "",
    url ? `url=${encodeURIComponent(url)}` : "",
  ].filter(Boolean);

  return parts.join(" | ");
}, [tracking, landingPath, referrer]);


  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);

    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const phone = phoneValue.trim();

    const contactMethod = String(form.get("contactMethod") || "email").trim();

    const taxYearRaw = String(form.get("taxYear") || "").trim();
    const taxYear = taxYearRaw ? Number(taxYearRaw) : undefined;

    const lastPreparer = String(form.get("lastPreparer") || "").trim();
    const priorTaxReturns = String(form.get("priorTaxReturns") || "").trim();
    const priorTaxReturnsLabel =
      priorTaxReturns === "yes" ? "Yes" : priorTaxReturns === "no" ? "No" : "";

    const messageRaw = String(form.get("message") || "").trim();

    const hp = String(form.get("_hp") || "");
    if (hp) return; // honeypot

    if (!name) return setError("Please enter your full name.");
    if (!email || !isValidEmail(email))
      return setError("Please enter a valid email address.");
    if (phone && !isValidPhone(phone))
      return setError(
        "Please enter a valid 10-digit phone number or leave it blank."
      );

    if (taxYear !== undefined) {
      if (!Number.isInteger(taxYear))
        return setError("Tax year must be a whole number.");
      if (taxYear < 2000 || taxYear > 2100)
        return setError("Tax year must be between 2000 and 2100.");
    }

    // Fold extra info into a single notes field (matches your waitlist schema)
    const extras = [
      contactMethod ? `Preferred contact: ${contactMethod}` : "",
      taxYear ? `Tax year: ${taxYear}` : "",
      lastPreparer ? `Last preparer: ${lastPreparer}` : "",
      priorTaxReturnsLabel
        ? `Needs prior-year returns: ${priorTaxReturnsLabel}`
        : "",
      pageSource ? `Source: ${pageSource}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const notes =
      [messageRaw, extras].filter(Boolean).join("\n").trim() || undefined;

    setLoading(true);
    try {
      await joinWaitlist({
        fullName: name,
        email,
        phone: phone || undefined,

        plan: tracking.plan, // from ?plan=
        notes,
        roleType: "taxpayer",

        // ✅ NEW: attribution fields (match your DB columns)
        utmSource: tracking.utm_source,
        utmMedium: tracking.utm_medium,
        utmCampaign: tracking.utm_campaign,
        utmContent: tracking.utm_content,
        utmTerm: tracking.utm_term,

        gclid: tracking.gclid,
        fbclid: tracking.fbclid,

        landingPath: landingPath || "/waitlist",
        referrer: referrer || undefined,

        // agencyId: if you later map agency slug -> firm UUID, set it here
      });

      // ✅ reset controlled phone input no matter what
      setPhoneValue("");

      if (USE_REDIRECT_AFTER_SUBMIT) {
        router.push("/site/waitlist/thanks");
      } else {
        setOk(true);
        (e.currentTarget as HTMLFormElement).reset();
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
          onClick={() => {
            setOk(false);
            setError(null);
            setPhoneValue("");
          }}
          className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-white shadow hover:bg-emerald-700 transition"
        >
          Add another
        </button>
      </div>
    );
  }

  return (
    <section className="relative isolate">
      {/* decorative blobs (use your theme tokens) */}
      <div
        className="pointer-events-none absolute -top-16 -left-10 h-52 w-52 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-10 h-60 w-60 rounded-full bg-accent/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card/80 backdrop-blur p-6 sm:p-8 shadow-xl">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-border">
            <span>✨ Priority Access</span>

            {tracking.plan && (
              <span className="rounded-full bg-card px-2 py-0.5 text-primary shadow-sm border border-border">
                Plan: {tracking.plan}
              </span>
            )}

            {tracking.agency && (
              <span className="rounded-full bg-card px-2 py-0.5 text-primary shadow-sm border border-border">
                {tracking.agency}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Join the Waitlist
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
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
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {/* Name */}
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-foreground">
              Full name *
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.8 0 5-2.2 5-5s-2.2-5-5-5-5 2.2-5 5 2.2 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
                </svg>
              </span>

              <input
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Jane Doe"
                minLength={2}
                maxLength={80}
                pattern="^[A-Za-z][A-Za-z\s.'-]{1,79}$"
                title="Enter your full name (letters, spaces, apostrophes, hyphens)."
                className="w-full rounded-xl border border-input bg-background px-10 py-3 text-sm outline-none transition
                       focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-foreground">
                Email *
              </label>
              <span className="pointer-events-none absolute left-3 top-[42px] text-muted-foreground">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 13l-12-8h24l-12 8zm-12-6l12 8 12-8v11h-24v-11z" />
                </svg>
              </span>

              <input
                name="email"
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={254}
                placeholder="jane@example.com"
                pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
                title="Enter a valid email address (example: name@example.com)"
                className="w-full rounded-xl border border-input bg-background px-10 py-3 text-sm outline-none transition
                       focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-foreground">
                Phone *
              </label>
              <span className="pointer-events-none absolute left-3 top-[42px] text-muted-foreground">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.6 10.8c1.2 2.4 3.2 4.4 5.6 5.6l2-2c.3-.3.8-.4 1.2-.2 1 .4 2.1.6 3.2.6.6 0 1 .4 1 1v3.1c0 .6-.4 1-1 1C9.4 20 4 14.6 4 8.4c0-.6.4-1 1-1H8c.6 0 1 .4 1 1 0 1.1.2 2.2.6 3.2.2.4.1.9-.2 1.2l-1.8 2z" />
                </svg>
              </span>

              <input
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="(555) 555-5555"
                value={phoneValue}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  const formatted =
                    digits.length <= 3
                      ? digits
                      : digits.length <= 6
                      ? `(${digits.slice(0, 3)}) ${digits.slice(3)}`
                      : `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                  setPhoneValue(formatted);
                }}
                className="w-full rounded-xl border border-input bg-background px-10 py-3 text-sm outline-none transition
                       focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Contact + Year */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Preferred contact
              </label>
              <select
                name="contactMethod"
                defaultValue="email"
                className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition
                       focus:ring-2 focus:ring-ring"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="phone">Phone Call</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Tax year (optional)
              </label>
              <input
                name="taxYear"
                type="number"
                inputMode="numeric"
                min={2000}
                max={2100}
                step={1}
                placeholder="2024"
                onKeyDown={(e) => {
                  if (["e", "E", "+", "-", "."].includes(e.key))
                    e.preventDefault();
                }}
                className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition
                       focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Extra selects */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Who prepared your taxes last season?
              </label>
              <select
                name="lastPreparer"
                defaultValue="myself"
                className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition
                       focus:ring-2 focus:ring-ring"
              >
                <option value="firm">Tax Professional (another firm)</option>
                <option value="myself">I prepared them myself</option>
                <option value="none">I didn’t file my taxes</option>
                <option value="swts">Tax Professional (SW Tax Service)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Need prior-year tax returns filed?
              </label>
              <select
                name="priorTaxReturns"
                defaultValue="yes"
                className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition
                       focus:ring-2 focus:ring-ring"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Anything else? (optional)
            </label>
            <textarea
              name="message"
              placeholder="Tell us what you need help with or your preferred dates."
              rows={4}
              className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition
                     focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 font-semibold text-white shadow-md transition-all
                   hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{ background: "var(--brand-gradient)" }}
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

          <p className="text-center text-xs text-muted-foreground">
            We respect your time and privacy. No spam.
          </p>
        </form>
      </div>
    </section>
  );
}
