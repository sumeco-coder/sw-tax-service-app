"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import {
  onboardingListMyDocuments,
  onboardingCreateMyUploadUrl,
  onboardingFinalizeMyUpload,
  onboardingCreateMyDownloadUrl,
  saveDocuments,
} from "../actions";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type DocItem = {
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
};

export default function OnboardingDocumentsClient() {
  const [busy, startTransition] = useTransition();

  const [docs, setDocs] = useState<DocItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [acknowledged, setAcknowledged] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function refresh() {
    const res = await onboardingListMyDocuments();

    if (!res.ok) {
      if (res.code === "UNAUTHENTICATED") {
        window.location.href =
          "/sign-in?next=" + encodeURIComponent("/onboarding/documents");
        return;
      }
      if (res.code === "NO_USER_ROW") {
        window.location.href = "/onboarding";
        return;
      }

      setDocs([]);
      setError(res.message || "Failed to load documents.");
      return;
    }

    setDocs(res.data);
    setError(null);
  }

  useEffect(() => {
    startTransition(() => {
      refresh().catch((e: any) =>
        setError(e?.message || "Failed to load documents.")
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadOne(file: File) {
    setError(null);

    // (we accept it, but server is NOT signing ContentType)
    const contentType = file.type || "application/octet-stream";

    // 1) presign PUT
    const presign = await onboardingCreateMyUploadUrl({
      fileName: file.name,
      contentType,
    });

    if (!presign.ok) {
      if (presign.code === "UNAUTHENTICATED") {
        window.location.href =
          "/sign-in?next=" + encodeURIComponent("/onboarding/documents");
        return;
      }
      if (presign.code === "NO_USER_ROW") {
        window.location.href = "/onboarding";
        return;
      }
      setError(presign.message || "Failed to create upload URL.");
      return;
    }

    const url = presign.data.url;

    // quick sanity check (helps catch wrong endpoint / bad presign)
    if (!url.includes("X-Amz-Signature=")) {
      throw new Error("Bad presigned URL (missing signature).");
    }

    // 2) PUT to S3 (no Content-Type header to avoid signature mismatch)
    const up = await fetch(url, {
      method: "PUT",
      body: file,
    });

    if (!up.ok) {
      throw new Error(`Upload failed (${up.status}).`);
    }

    // 3) finalize (HeadObject + DB insert AFTER upload exists)
    const fin = await onboardingFinalizeMyUpload({
      key: presign.data.key,
      fileName: file.name,
    });

    if (!fin.ok) {
      if (fin.code === "UNAUTHENTICATED") {
        window.location.href =
          "/sign-in?next=" + encodeURIComponent("/onboarding/documents");
        return;
      }
      if (fin.code === "NO_USER_ROW") {
        window.location.href = "/onboarding";
        return;
      }
      setError(
        fin.message ||
          "Upload finished but could not be finalized. Please try again."
      );
      return;
    }

    await refresh();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    startTransition(() => {
      uploadOne(f)
        .then(() => {
          e.target.value = "";
        })
        .catch((err: any) => {
          console.error(err);
          setError(err?.message || "Upload failed.");
        });
    });
  }

  async function handleDownload(doc: DocItem) {
    setError(null);

    const res = await onboardingCreateMyDownloadUrl(doc.key);

    if (!res.ok) {
      if (res.code === "UNAUTHENTICATED") {
        window.location.href =
          "/sign-in?next=" + encodeURIComponent("/onboarding/documents");
        return;
      }
      if (res.code === "NO_USER_ROW") {
        window.location.href = "/onboarding";
        return;
      }
      setError(res.message || "Download failed.");
      return;
    }

    window.open(res.data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Step 2 of 6</Badge>
            <Badge className="bg-primary text-primary-foreground">
              Documents
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Upload your tax documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload clear photos or PDFs. You can still continue and upload more
            later.
          </p>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upload</CardTitle>
            <CardDescription>
              These documents help us prepare your return accurately and avoid
              delays.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            ) : null}

            <Alert className="rounded-xl">
              <AlertDescription className="text-sm">
                Tip: Make sure the whole page is visible and not blurry.
              </AlertDescription>
            </Alert>

            <section className="space-y-4">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <label className="text-sm font-semibold text-foreground">
                  Upload
                </label>

                <input
                  type="file"
                  disabled={busy}
                  onChange={onPickFile}
                  accept="application/pdf,image/*"
                  className="mt-2 block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />

                <p className="mt-2 text-xs text-muted-foreground">
                  Upload → verify in S3 → save in DB (prevents phantom
                  downloads).
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    Uploaded documents
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => startTransition(() => refresh())}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground/80 hover:bg-muted disabled:opacity-60"
                    type="button"
                  >
                    Refresh
                  </button>
                </div>

                {docs.length === 0 ? (
                  <div className="mt-3 rounded-lg border border-border bg-muted px-3 py-3 text-xs text-muted-foreground">
                    No documents uploaded yet.
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {docs.map((doc) => (
                      <li
                        key={doc.key}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {doc.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {doc.lastModified
                              ? new Date(doc.lastModified).toLocaleString()
                              : ""}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            startTransition(() => handleDownload(doc))
                          }
                          className="text-[11px] font-semibold text-foreground/80 hover:text-foreground disabled:opacity-60"
                          disabled={busy}
                        >
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
                <p className="text-sm font-semibold text-foreground">
                  Common documents to upload
                </p>

                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>• Photo ID (Driver’s license, state ID, or passport)</li>
                  <li>• Social Security cards for you and all dependents</li>
                  <li>
                    • Income forms (W-2, 1099, 1099-NEC, unemployment, etc.)
                  </li>
                  <li>
                    • Credits & deductions (childcare, tuition 1098-T, donations,
                    etc.)
                  </li>
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
                    I’ve uploaded or gathered my documents, or I’ll finish
                    uploading them before my review call.
                  </span>
                </Label>

                {submitError ? (
                  <p className="text-xs text-destructive">{submitError}</p>
                ) : null}
              </div>

              <ContinueButton />

              <p className="text-center text-[11px] text-muted-foreground">
                You can come back later to upload additional documents if
                something changes.
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
