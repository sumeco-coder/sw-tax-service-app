// app/(client)/(protected)/(onboarding)/onboarding/profile/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import { saveProfile } from "./actions";
import { Eye, EyeOff, Loader2 } from "lucide-react";

// shadcn/ui
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * ✅ MUST: sync Amplify session -> server cookies
 * so server actions (saveProfile) can read tokens reliably.
 */
async function syncServerCookiesFromSession() {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString() ?? "";
  const idToken = session.tokens?.idToken?.toString() ?? "";

  if (!accessToken || !idToken) return null;

  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, idToken }),
    cache: "no-store",
    credentials: "include",
  });

  return session;
}

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
  const router = useRouter();

  // ✅ configure Amplify once (prevents weird reconfigure bugs)
  const configuredRef = useRef(false);
  useEffect(() => {
    if (!configuredRef.current) {
      configureAmplify();
      configuredRef.current = true;
    }
  }, []);

  const formRef = useRef<HTMLFormElement | null>(null);

  const [user, setUser] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ssn, setSsn] = useState("");
  const [showSsn, setShowSsn] = useState(false);

  // shadcn Select needs state + hidden inputs for form submit
  const [stateValue, setStateValue] = useState("");
  const [suffixValue, setSuffixValue] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const u = await getCurrentUser();

        // ✅ IMPORTANT: sync cookies immediately on page load
        const session = await syncServerCookiesFromSession();

        const payload = session?.tokens?.idToken?.payload ?? {};
        const tokenEmail = String(payload["email"] ?? "").trim();
        const givenName = String(payload["given_name"] ?? "").trim();
        const familyName = String(payload["family_name"] ?? "").trim();
        const phoneNumber = String(payload["phone_number"] ?? "").trim();

        const loginId = (u as any)?.signInDetails?.loginId as string | undefined;
        const email = (tokenEmail || loginId || (u as any)?.username || "").trim();
        if (!email) throw new Error("Missing email in session");

        if (cancelled) return;

        setUser({
          sub: (u as any).userId,
          email,
          firstName: givenName || undefined,
          lastName: familyName || undefined,
          phone: phoneNumber || undefined,
        });
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setError("You must be signed in to access onboarding.");
        router.replace("/sign-in?next=/onboarding/profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleContinue() {
    if (submitting) return;
    setSubmitting(true);
    try {
      // ✅ re-sync right before submit (prevents “stale admin cookie” + 500 digest)
      await syncServerCookiesFromSession();
      formRef.current?.requestSubmit();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading…</CardTitle>
            <CardDescription>Loading your profile.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Please wait.
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              {error ??
                "We couldn’t find your session. Please sign in again to continue onboarding."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/sign-in?next=/onboarding/profile">Go to sign-in</a>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/60 to-background px-4 py-10">
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Step 1 of 5
          </p>
          <CardTitle className="text-2xl">Confirm your details</CardTitle>
          <CardDescription>
            We’ll use this information on your tax return and to keep you updated about your file.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* ✅ Server action reads tokens from cookies (synced above) */}
          <form ref={formRef} action={saveProfile} className="space-y-6">
            {/* Email (locked) */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
              <p className="text-xs text-muted-foreground">
                Email is locked to the account you used.
              </p>
            </div>

            {/* Legal name */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Legal name</h3>
                <p className="text-xs text-muted-foreground">
                  Enter your name exactly as it appears on your Social Security card.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label>
                    First name <span className="text-destructive">*</span>
                  </Label>
                  <Input name="firstName" required defaultValue={user.firstName ?? ""} />
                </div>

                <div className="space-y-2">
                  <Label>Middle name</Label>
                  <Input name="middleName" defaultValue="" placeholder="Optional" />
                </div>

                <div className="space-y-2">
                  <Label>
                    Last name <span className="text-destructive">*</span>
                  </Label>
                  <Input name="lastName" required defaultValue={user.lastName ?? ""} />
                </div>

                <div className="space-y-2">
                  <Label>Suffix</Label>
                  {/* shadcn Select + hidden input */}
                  <input type="hidden" name="suffix" value={suffixValue} />
                  <Select value={suffixValue} onValueChange={setSuffixValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="Jr">Jr</SelectItem>
                      <SelectItem value="Sr">Sr</SelectItem>
                      <SelectItem value="II">II</SelectItem>
                      <SelectItem value="III">III</SelectItem>
                      <SelectItem value="IV">IV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact & address */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Contact & address</h3>
                <p className="text-xs text-muted-foreground">
                  This should be your current mailing address for IRS/state notices.
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Mobile phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  name="phone"
                  type="tel"
                  required
                  defaultValue={user.phone ?? ""}
                  placeholder="(555) 555-5555"
                  autoComplete="tel"
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.value = formatUSPhone(el.value);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Used for appointment reminders and important updates.
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Address line 1 <span className="text-destructive">*</span>
                </Label>
                <Input name="address1" required placeholder="Street address" />
              </div>

              <div className="space-y-2">
                <Label>Address line 2</Label>
                <Input name="address2" placeholder="Apt, suite, unit, etc. (optional)" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input name="city" required />
                </div>

                <div className="space-y-2">
                  <Label>
                    State <span className="text-destructive">*</span>
                  </Label>
                  {/* shadcn Select + hidden input */}
                  <input type="hidden" name="state" value={stateValue} />
                  <Select value={stateValue} onValueChange={setStateValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[260px]">
                      {US_STATES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.value} – {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    ZIP code <span className="text-destructive">*</span>
                  </Label>
                  <Input name="zip" required inputMode="numeric" placeholder="12345" />
                </div>
              </div>
            </div>

            {/* DOB + SSN */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Date of birth <span className="text-destructive">*</span>
                </Label>
                <Input type="date" name="dob" required />
              </div>

              <div className="space-y-2">
                <Label>Social Security Number</Label>

                <div className="relative">
                  <Input
                    type={showSsn ? "text" : "password"}
                    name="ssn"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="XXX-XX-XXXX"
                    className="pr-10"
                    value={ssn}
                    onChange={(e) => setSsn(formatSSN(e.target.value))}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowSsn((v) => !v)}
                    aria-label={showSsn ? "Hide SSN" : "Show SSN"}
                  >
                    {showSsn ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Optional — you can provide this over the phone if you prefer.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                You can update this information later if something changes.
              </p>

              {/* ✅ button does cookie sync then submits form */}
              <Button type="button" onClick={handleContinue} disabled={submitting}>
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "Save and continue to documents"
                )}
              </Button>
            </div>

            {/* IMPORTANT: require state selection */}
            {/* If you want state to be required, enforce it client-side: */}
            <p className={cn("text-xs text-muted-foreground", stateValue ? "hidden" : "")}>
              Note: Please select a state before continuing.
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
