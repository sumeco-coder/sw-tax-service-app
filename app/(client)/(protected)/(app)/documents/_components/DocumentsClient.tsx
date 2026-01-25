// app/(client)/(protected)/(app)/documents/_components/DocumentsClient.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listMyDocuments,
  createUploadUrl,
  finalizeUpload,
  createMyDownloadUrl,
  createClientDownloadUrl,
  deleteDocument,
} from "../actions";

// ✅ import admin server actions (DB-backed)
import {
  adminListDocuments,
  adminDeleteDocument,
  type AdminDocItem,
} from "@/app/(admin)/admin/(protected)/clients/[userId]/documents/actions";

type DocItem = {
  id?: string; // admin DB rows have this
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
};

function fmtSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default function DocumentsClient({
  targetUserId,
  mode,
}: {
  targetUserId: string;
  mode: "client" | "admin";
}) {
  const [busy, startTransition] = useTransition();
  const [items, setItems] = useState<DocItem[]>([]);
  const [err, setErr] = useState("");

  const title = useMemo(
    () => (mode === "admin" ? "Client documents" : "Documents"),
    [mode]
  );

  async function refresh() {
    const rows =
      mode === "admin"
        ? ((await adminListDocuments(targetUserId)) as AdminDocItem[])
        : await listMyDocuments();

    const normalized: DocItem[] = (rows as any[]).map((r) => ({
      id: r.id ? String(r.id) : undefined,
      key: String(r.key),
      name: String(r.name ?? r.fileName ?? "Document"),
      size: Number(r.size ?? 0),
      lastModified: r.lastModified
        ? String(r.lastModified)
        : r.uploadedAt
        ? new Date(r.uploadedAt).toISOString()
        : null,
    }));

    setItems(normalized);
  }

  useEffect(() => {
    startTransition(() => {
      refresh().catch((e: any) =>
        setErr(e?.message ?? "Failed to load documents.")
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, mode]);

  async function onUpload(file: File) {
    setErr("");

    const contentType = file.type || "application/octet-stream";

    // 1) Get presigned POST (NO DB write here)
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

    // 2) Upload to S3 using POST + FormData (NOT PUT)
    const form = new FormData();
    for (const [k, v] of Object.entries(out.fields || {})) {
      form.append(k, v as string);
    }
    // S3 expects the actual file field to be named "file"
    form.append("file", file);

    const res = await fetch(out.url, {
      method: "POST",
      body: form,
    });

    // POST success is often 204 or 201
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Upload failed (${res.status}). ${text.slice(0, 200)}`);
    }

    // 3) Finalize (HeadObject check + DB insert AFTER S3 upload)
    await finalizeUpload({
      key: out.key,
      fileName: file.name,
      ...(mode === "admin" ? { targetUserId } : {}),
    });

    // 4) Refresh list
    await refresh();
  }

  async function onDownload(key: string) {
    setErr("");

    const out =
      mode === "admin"
        ? await createClientDownloadUrl(targetUserId, key)
        : await createMyDownloadUrl(key);

    window.open(out.url, "_blank", "noopener,noreferrer");
  }

  async function onDelete(item: DocItem) {
    setErr("");

    if (mode !== "admin") throw new Error("Forbidden.");

    // ✅ If we have a DB id, delete DB record
    if (item.id) {
      await adminDeleteDocument(targetUserId, item.id);
    }

    // ✅ Remove from S3 + DB (based on your server action behavior)
    await deleteDocument({ targetUserId, key: item.key });

    await refresh();
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "admin"
              ? "Upload, download, and manage files in this client’s folder."
              : "Upload your documents here and download them anytime."}
          </p>
        </div>

        <button
          className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-secondary/40 disabled:opacity-60"
          onClick={() =>
            startTransition(() => {
              setErr("");
              refresh().catch((e: any) =>
                setErr(e?.message ?? "Failed to load documents.")
              );
            })
          }
          disabled={busy}
        >
          Refresh
        </button>
      </header>

      {err ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      ) : null}

      {/* Upload */}
      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <label
          htmlFor="client-upload"
          className="text-sm font-semibold text-foreground"
        >
          Upload
        </label>

        <input
          id="client-upload"
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

      {/* Files */}
      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <p className="text-sm font-semibold text-foreground">Files</p>

        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li
              key={it.key}
              className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{it.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {fmtDate(it.lastModified)}
                  {it.lastModified ? " · " : ""}
                  {fmtSize(it.size)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  disabled={busy}
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
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-secondary/40 disabled:opacity-60"
                    disabled={busy}
                    onClick={() =>
                      startTransition(() => {
                        onDelete(it).catch((e: any) =>
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
