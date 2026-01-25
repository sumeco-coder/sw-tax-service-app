// app/(client)/(protected)/(onboarding)/onboarding/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { configureAmplify } from "@/lib/amplifyClient";
import { saveProfile } from "./actions";
import { Eye, EyeOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

/** Only allow internal app paths to avoid open-redirect attacks */
function safeInternalPath(input: string | null, fallback: string) {
  const raw = (input ?? "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  return raw;
}

/** Keep server cookies in sync (so server actions / API routes can trust session) */
/** Keep server cookies in sync (so server actions / API routes can trust session) */
async function ensureServerSession(forceRefresh = false) {
  const session = await fetchAuthSession({ forceRefresh });
  const idToken = session.tokens?.idToken?.toString();
  const accessToken = session.tokens?.accessToken?.toString();

  if (!idToken || !accessToken) return null;

  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({ idToken, accessToken }),
  });

  if (!res.ok) return null;
  return session;
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
  const sp = useSearchParams();

  const [ssn, setSsn] = React.useState("");
  const [showSsn, setShowSsn] = React.useState(false);

  const [user, setUser] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // preserve context if they got here from invite flow
  const invite = useMemo(() => (sp.get("invite") ?? "").trim(), [sp]);
  const nextParam = useMemo(() => sp.get("next"), [sp]);

  const safeNext = useMemo(
    () => safeInternalPath(nextParam, "/onboarding/profile"),
    [nextParam],
  );

  const signInHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (invite) qs.set("invite", invite);
    if (safeNext) qs.set("next", safeNext);
    const s = qs.toString();
    return `/sign-in${s ? `?${s}` : ""}`;
  }, [invite, safeNext]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const u = await getCurrentUser();

        // sync server cookies (important for server actions / api routes)
        const session =
          (await ensureServerSession(true)) ??
          (await fetchAuthSession({ forceRefresh: true }));

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

        if (cancelled) return;

        if (!u || !u.userId || !email) {
          setError("You must be signed in to access onboarding.");
          return;
        }

        setUser({
          sub: u.userId,
          email,
          firstName: givenName || undefined,
          lastName: familyName || undefined,
          phone: phoneNumber || undefined,
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("You must be signed in to access onboarding.");
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
      <main className="min-h-screen bg-gradient-to-b from-secondary to-background px-4 py-10">
        <div className="mx-auto max-w-md">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>
                {error ??
                  "We couldn’t find your session. Please sign in again to continue onboarding."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full rounded-xl">
                <a href={signInHref}>Go to sign-in</a>
              </Button>
            </CardContent>
          </Card>
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
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Step 1 of 6</Badge>
              <Badge className="bg-primary text-primary-foreground">
                Profile
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Confirm your details
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We’ll use this information on your tax return and to keep you
              updated about your file.
            </p>
          </div>

          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/onboarding">Back to onboarding</Link>
          </Button>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your information</CardTitle>
            <CardDescription>
              Enter your legal details exactly as shown on your Social Security
              card.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form action={saveProfile} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} disabled className="rounded-xl" />
                <p className="text-xs text-muted-foreground">
                  Email is locked to the account you used.
                </p>
              </div>

              <Separator />

              {/* Legal name */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Legal name
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enter your name exactly as it appears on your Social
                    Security card.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label>
                      First name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      name="firstName"
                      required
                      defaultValue={user.firstName ?? ""}
                      autoComplete="given-name"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Middle name</Label>
                    <Input
                      name="middleName"
                      defaultValue=""
                      autoComplete="additional-name"
                      placeholder="Optional"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Last name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      name="lastName"
                      required
                      defaultValue={user.lastName ?? ""}
                      autoComplete="family-name"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Suffix</Label>
                    <select
                      name="suffix"
                      defaultValue=""
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
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

              <Separator />

              {/* Contact & address */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Contact & address
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This should be your current mailing address for IRS/state
                    notices.
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
                    className="rounded-xl"
                    inputMode="numeric"
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
                  <Input
                    name="address1"
                    required
                    placeholder="Street address"
                    autoComplete="address-line1"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Address line 2</Label>
                  <Input
                    name="address2"
                    placeholder="Apt, suite, unit, etc. (optional)"
                    autoComplete="address-line2"
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      name="city"
                      required
                      autoComplete="address-level2"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      State <span className="text-destructive">*</span>
                    </Label>
                    <select
                      name="state"
                      required
                      defaultValue=""
                      autoComplete="address-level1"
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
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

                  <div className="space-y-2">
                    <Label>
                      ZIP code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      name="zip"
                      required
                      inputMode="numeric"
                      placeholder="12345"
                      autoComplete="postal-code"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* DOB + SSN */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Date of birth <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    name="dob"
                    required
                    className="rounded-xl"
                  />
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
                      className="rounded-xl pr-11"
                      value={ssn}
                      onChange={(e) => setSsn(formatSSN(e.target.value))}
                      autoComplete="off"
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-xl"
                      onClick={() => setShowSsn((v) => !v)}
                      aria-label={showSsn ? "Hide SSN" : "Show SSN"}
                    >
                      {showSsn ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Optional — you can provide this over the phone if you
                    prefer.
                  </p>
                </div>
              </div>

              <Alert className="rounded-xl">
                <AlertDescription className="text-sm">
                  You can update this information later if something changes.
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full rounded-xl">
                Save and continue to documents
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
