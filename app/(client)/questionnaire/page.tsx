// app/(main)/questionnaire/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";
import DependentQuestionnaire, {
  type DependentQuestionnaireValues,
} from "../_components/DependentQuestionnaire"; // adjust path if needed

configureAmplify();

export default function QuestionnairePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        // Amplify v6 typically exposes both of these:
        setUserId((u as any)?.userId ?? (u as any)?.username ?? null);
        setEmail((u as any)?.signInDetails?.loginId ?? null);
      } catch {
        setUserId(null);
        setEmail(null);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  const handleSave = async (values: DependentQuestionnaireValues) => {
    const payload = {
      ...values,
      userId: userId ?? undefined,
      email: email ?? undefined,
    };

    // Send to your API (Drizzle on the server)
    const res = await fetch("/api/dependents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save dependent");
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Dependent Questionnaire</h1>

      {/* Optional: gate the form behind auth if you require login */}
      {/* {!checkingAuth && !userId && <p className="text-sm text-red-600">Please sign in to complete this questionnaire.</p>} */}

      <DependentQuestionnaire onSave={handleSave} />
    </div>
  );
}
