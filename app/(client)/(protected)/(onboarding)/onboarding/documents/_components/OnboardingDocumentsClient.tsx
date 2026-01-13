"use client";

import { useState } from "react";
import { saveDocuments } from "../actions";
import DocumentUploader from "../../_components/DocumentUploader";
import DocumentList from "../../../../(app)/documents/_components/DocumentList";
import { useFormStatus } from "react-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

export default function OnboardingDocumentsClient() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Step 2 of 6</Badge>
            <Badge className="bg-primary text-primary-foreground">Documents</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Upload your tax documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload clear photos or PDFs. You can still continue and upload more later.
          </p>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upload</CardTitle>
            <CardDescription>
              These documents help us prepare your return accurately and avoid delays.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="rounded-xl">
              <AlertDescription className="text-sm">
                Tip: Make sure the whole page is visible and not blurry.
              </AlertDescription>
            </Alert>

            <section className="space-y-4">
              <DocumentUploader />
              <DocumentList />
            </section>

            <Separator />

            <form
              action={saveDocuments}
              onSubmit={(e) => {
                if (!acknowledged) {
                  e.preventDefault();
                  setSubmitError(
                    "Please confirm you’ve uploaded or gathered your documents before continuing."
                  );
                  return;
                }
                setSubmitError(null);
              }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">Common documents to upload</p>

                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>• Photo ID (Driver’s license, state ID, or passport)</li>
                  <li>• Social Security cards for you and all dependents</li>
                  <li>• Income forms (W-2, 1099, 1099-NEC, unemployment, etc.)</li>
                  <li>• Credits & deductions (childcare, tuition 1098-T, donations, etc.)</li>
                  <li>• Prior-year return (if you filed last year)</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-2">
                <Label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="acknowledged"
                    className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                    checked={acknowledged}
                    onChange={(e) => {
                      setAcknowledged(e.target.checked);
                      if (e.target.checked) setSubmitError(null);
                    }}
                  />
                  <span className="text-muted-foreground">
                    I’ve uploaded or gathered my documents, or I’ll finish uploading them before my review call.
                  </span>
                </Label>

                {submitError && <p className="text-xs text-destructive">{submitError}</p>}
              </div>

              <ContinueButton />

              <p className="text-center text-[11px] text-muted-foreground">
                You can come back later to upload additional documents if something changes.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ContinueButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full rounded-xl">
      {pending ? "Saving…" : "Continue to questions"}
    </Button>
  );
}
