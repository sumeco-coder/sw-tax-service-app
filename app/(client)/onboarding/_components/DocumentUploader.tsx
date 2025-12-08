// app/(client)/onboarding/_components/DocumentUploader.tsx
"use client";

import { useState, useTransition } from "react";
import { uploadDocument } from "../documents/actions";

type DocumentUploaderProps = {
  cognitoSub: string;
  onUploaded?: (doc: any) => void; // you can type this better with your doc type
};

export default function DocumentUploader({
  cognitoSub,
  onUploaded,
}: DocumentUploaderProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simple validation example
    if (file.size > 10 * 1024 * 1024) {
      setError("Max file size is 10MB.");
      return;
    }

    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("cognitoSub", cognitoSub);

    startTransition(async () => {
      try {
        const doc = await uploadDocument(formData);
        if (onUploaded) onUploaded(doc);
      } catch (err) {
        console.error(err);
        setError("Failed to upload. Please try again.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 text-sm font-semibold text-slate-900">
        Upload your documents
      </p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-xs text-slate-600 hover:border-blue-400">
        <span>
          {isPending
            ? "Uploading..."
            : "Click to choose a file (PDF, JPG, PNG)"}
        </span>
        <input
          type="file"
          className="hidden"
          accept="application/pdf,image/*"
          onChange={handleChange}
          disabled={isPending}
        />
      </label>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-[11px] text-slate-500">
        Please make sure your photos or scans are clear and readable.
      </p>
    </div>
  );
}
