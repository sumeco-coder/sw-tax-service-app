// app/(client)/(protected)/(app)/documents/_components/DocumentsClient.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import {
  listClientDocuments,
  listMyDocuments,
  createUploadUrl,
  createMyDownloadUrl,
  createClientDownloadUrl,
  deleteDocument,
} from "../actions";

export default function DocumentsClient({
  targetUserId,
  mode,
}: {
  targetUserId: string;
  mode: "client" | "admin";
}) {
  const [busy, startTransition] = useTransition();
  const [items, setItems] = useState<
    Array<{
      key: string;
      name: string;
      size: number;
      lastModified: string | null;
    }>
  >([]);
  const [err, setErr] = useState("");

  async function refresh() {
    const rows =
      mode === "admin"
        ? await listClientDocuments(targetUserId)
        : await listMyDocuments();

    setItems(rows);
  }

  useEffect(() => {
    startTransition(() => {
      refresh().catch((e: any) => {
        setErr(e?.message ?? "Failed to load documents.");
      });
    });
  }, [targetUserId, mode]);

  async function onUpload(file: File) {
    setErr("");

    const contentType = file.type || "application/octet-stream";

    const out =
      mode === "admin"
        ? await createUploadUrl({
            targetUserId,
            fileName: file.name,
            contentType,
          })
        : await createUploadUrl({
            fileName: file.name,
            contentType,
          });

    const put = await fetch(out.url, {
      method: "PUT",
      headers: { "content-type": contentType },
      body: file,
    });

    if (!put.ok) throw new Error("Upload failed.");

    await refresh();
  }

  async function onDownload(key: string) {
    setErr("");

    const out =
      mode === "admin"
        ? await createClientDownloadUrl(targetUserId, key)
        : await createMyDownloadUrl(key);

    window.open(out.url, "_blank");
  }

  async function onDelete(key: string) {
    setErr("");

    // UI already hides delete unless admin; this extra guard prevents accidental calls.
    if (mode !== "admin") throw new Error("Forbidden.");

    await deleteDocument({ targetUserId, key });
    await refresh();
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "admin"
            ? "Upload documents to the client’s folder."
            : "Upload your documents here and download them anytime."}
        </p>
      </header>

      {err ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <label htmlFor="client-upload" className="text-sm font-semibold text-foreground">
          Upload
        </label>

        <input
          type="file"
          className={[
            "mt-2 block w-full cursor-pointer rounded-xl border border-border px-3 py-2 text-sm",
            "bg-secondary/40 text-foreground",
            "file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground",
            "hover:file:opacity-90",
            "focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40",
            "disabled:cursor-not-allowed disabled:opacity-60",
          ].join(" ")}
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;

            startTransition(() => {
              onUpload(f)
                .then(() => {
                  e.target.value = "";
                })
                .catch((e: any) => {
                  setErr(e?.message ?? "Upload failed.");
                });
            });
          }}
        />
      </div>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Files</p>

          <button
            className="rounded-lg cursor-pointer border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary/40 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() =>
              startTransition(() => {
                setErr("");
                refresh().catch((e: any) => setErr(e?.message ?? "Failed to load documents."));
              })
            }
            disabled={busy}
          >
            Refresh
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li
              key={it.key}
              className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{it.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {it.lastModified ? new Date(it.lastModified).toLocaleString() : ""} ·{" "}
                  {(it.size / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  onClick={() =>
                    startTransition(() => {
                      onDownload(it.key).catch((e: any) =>
                        setErr(e?.message ?? "Download failed.")
                      );
                    })
                  }
                >
                  Download
                </button>

                {mode === "admin" ? (
                  <button
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-secondary/40"
                    onClick={() =>
                      startTransition(() => {
                        onDelete(it.key).catch((e: any) =>
                          setErr(e?.message ?? "Delete failed.")
                        );
                      })
                    }
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </li>
          ))}

          {items.length === 0 ? (
            <li className="text-sm text-muted-foreground">No documents yet.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
