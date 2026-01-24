"use client";

import React, { useState } from "react";
import {
  onboardingCreateMyUploadUrl,
  onboardingFinalizeMyUpload,
} from "../documents/actions";


type DocumentUploaderProps = {
  onUploaded?: () => void;
};

export default function DocumentUploader({
  onUploaded,
}: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("Max file size is 10MB.");

  const contentType = file.type || "application/octet-stream";

  const res = await onboardingCreateMyUploadUrl({
    fileName: file.name,
    contentType,
  });

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
    throw new Error(res.message || `Upload could not start (${res.code}).`);
  }

  const { url, key } = res.data;

  const put = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!put.ok) {
    throw new Error(`Upload failed (${put.status}). Please try again.`);
  }

  // ✅ finalize AFTER successful PUT (creates the documents row)
  const fin = await onboardingFinalizeMyUpload({
    key,
    fileName: file.name,
  });

  if (!fin.ok) {
    throw new Error(fin.message || "Upload saved to storage, but failed to finalize.");
  }
}

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      await uploadFile(file);
      onUploaded?.();
      e.target.value = "";
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to upload. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 text-sm font-semibold text-slate-900">
        Upload your documents
      </p>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-xs text-slate-600 hover:border-blue-400">
        <span>
          {uploading
            ? "Uploading..."
            : "Click to choose a file (PDF, JPG, PNG)"}
        </span>

        <input
          type="file"
          className="hidden"
          accept="application/pdf,image/*"
          onChange={handleChange}
          disabled={uploading}
        />
      </label>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <p className="mt-2 text-[11px] text-slate-500">
        Please make sure your photos or scans are clear and readable.
      </p>
    </div>
  );
}
