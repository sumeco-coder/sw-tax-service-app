// app/(client)/taxpayer/_components/OnboardingSignUpForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  signUp,
  confirmSignUp,
  signIn,
  fetchAuthSession,
} from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import Link from "next/link";
import { completeInvite } from "../onboarding-sign-up/actions";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  email: string;
  token: string;
  plan?: string;
  nextPath?: string;
}

type Phase = "signup" | "confirm";

const BRAND = {
  pink: "#E72B69",
  copper: "#BA4A26",
  charcoal: "#2C2B33",
};

const inputBase =
  "w-full rounded-xl border px-3 py-2 text-sm outline-none bg-white shadow-sm text-slate-900 caret-slate-900 placeholder:text-slate-400";

const inputFocus =
  "focus:ring-2 focus:ring-[#E72B69]/25 focus:border-[#E72B69]";
const inputBorder = "border-slate-200";

function safeInternalPath(input: string | undefined | null, fallback: string) {
  const raw = String(input ?? "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.startsWith("/onboarding")) return fallback; // next should be AFTER onboarding
  return raw;
}

async function syncServerCookiesFromSession() {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString() ?? "";
  const idToken = session.tokens?.idToken?.toString() ?? "";
  if (!accessToken || !idToken) return;

  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, idToken }),
    cache: "no-store",
  });
}

export default function OnboardingSignUpForm({
  email,
  token,
  plan,
  nextPath = "/dashboard",
}: Props) {
  const router = useRouter();

  useEffect(() => {
    configureAmplify();
  }, []);

  const normalizedNext = useMemo(
    () => safeInternalPath(nextPath, "/dashboard"),
    [nextPath]
  );

  const signInHref = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("invite", token);
    qs.set("next", normalizedNext); // ✅ next = AFTER onboarding
    return `/sign-in?${qs.toString()}`;
  }, [token, normalizedNext]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("signup");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const fn = firstName.trim();
      const ln = lastName.trim();
      const fullName = `${fn} ${ln}`.trim();

      const { isSignUpComplete, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            given_name: fn,
            family_name: ln,
            name: fullName || fn,
          },
        },
      });

      if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setPhase("confirm");
        setMsg(
          `We sent a verification code to ${
            nextStep.codeDeliveryDetails?.destination ?? email
          }.`
        );
      } else if (isSignUpComplete) {
        setMsg("Sign-up complete! You can now continue.");
      }
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message ?? "Sign-up failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code.trim(),
      });

      // auto sign-in after confirm
      try {
        await signIn({ username: email, password });
        await syncServerCookiesFromSession(); // ✅ critical for SSR-protected routes
      } catch (err) {
        console.error("signIn after confirm failed:", err);
      }

      // mark invite used
      try {
        await completeInvite(token);
      } catch (err) {
        console.error("completeInvite failed:", err);
      }

      setMsg("Account confirmed! Taking you to onboarding…");

      // ✅ go directly to your real onboarding step
      const qs = new URLSearchParams();
      qs.set("next", normalizedNext);

      const target = `/onboarding/profile?${qs.toString()}`;
      router.replace(target);
      setTimeout(() => {
        window.location.href = target;
      }, 50);
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message ?? "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur text-slate-900">
      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Taxpayer onboarding
          </p>

          {plan ? (
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
              }}
            >
              Plan: {plan}
            </span>
          ) : null}
        </div>

        <p className="text-sm text-slate-600">
          You&apos;re creating an account for{" "}
          <span className="font-semibold" style={{ color: BRAND.charcoal }}>
            {email}
          </span>
          .
        </p>
      </div>

      {phase === "signup" ? (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                First name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                className={`${inputBase} ${inputBorder} ${inputFocus}`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Last name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                className={`${inputBase} ${inputBorder} ${inputFocus}`}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
            <p className="mt-1 text-xs text-slate-500">
              Email is locked to the address that received this invite.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Create a password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a secure password"
                className={`${inputBase} ${inputBorder} ${inputFocus} pr-11`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <input type="hidden" name="token" value={token} />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
            }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Already have an account?{" "}
            {/* ✅ relative path works on localhost + www + app */}
            <Link href={signInHref} className="font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Verification code
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter the 6-digit code"
              className={`${inputBase} ${inputBorder} ${inputFocus}`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
            }}
          >
            {loading ? "Confirming…" : "Confirm account"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Already confirmed?{" "}
            <Link href={signInHref} className="font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}

      {msg && (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          {msg}
        </p>
      )}
    </div>
  );
}
