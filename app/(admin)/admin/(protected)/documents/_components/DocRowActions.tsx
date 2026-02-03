"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";

import {
  adminMarkDocReviewedFromForm,
  adminMarkDocNeedsAttentionFromForm,
  adminMarkDocNewFromForm,
} from "../actions";

type StatusKey = "new" | "reviewed" | "needs_attention";

function SubmitBtn({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      className="inline-flex items-center rounded-2xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

export default function DocRowActions({
  docId,
  userId,
  status,
  attentionNote,
  returnTo,
}: {
  docId: string;
  userId: string;
  status: StatusKey;
  attentionNote: string | null;
  returnTo: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const initialNote = useMemo(() => attentionNote ?? "", [attentionNote]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setNote(initialNote);
    const t = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open, initialNote]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Open client documents */}
        <Link
          href={`/admin/clients/${userId}/documents`}
          className="inline-flex items-center rounded-2xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          Open
        </Link>

        {/* Mark Reviewed */}
        {status !== "reviewed" ? (
          <form action={adminMarkDocReviewedFromForm}>
            <input type="hidden" name="docId" value={docId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <SubmitBtn title="Mark as reviewed">Reviewed</SubmitBtn>
          </form>
        ) : null}

        {/* Needs Attention -> modal */}
        {status !== "needs_attention" ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center rounded-2xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            title="Flag as needs attention"
          >
            Needs
          </button>
        ) : null}

        {/* Reset back to New */}
        {status !== "new" ? (
          <form action={adminMarkDocNewFromForm}>
            <input type="hidden" name="docId" value={docId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <SubmitBtn title="Reset to new">Reset</SubmitBtn>
          </form>
        ) : null}
      </div>

      {/* show attention note under buttons */}
      {status === "needs_attention" ? (
        <div className="text-right text-[11px] text-muted-foreground">
          {attentionNote ? `Note: ${attentionNote}` : "Needs attention"}
        </div>
      ) : null}

      {/* Modal */}
      {open ? (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close modal"
            onClick={() => setOpen(false)}
          />

          {/* dialog */}
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border bg-background shadow-xl">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Mark as Needs Attention</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Add a note so you remember what’s missing / what to fix.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  Close
                </button>
              </div>

              <form
                action={adminMarkDocNeedsAttentionFromForm}
                className="mt-4 space-y-3"
              >
                <input type="hidden" name="docId" value={docId} />
                <input type="hidden" name="returnTo" value={returnTo} />

                <textarea
                  ref={textareaRef}
                  name="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Example: Need 1099-NEC page 2 / missing ID / unreadable upload…"
                  className="min-h-[110px] w-full rounded-2xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
                  maxLength={500}
                />

                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    {note.length}/500
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="h-9 rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
                    >
                      Cancel
                    </button>

                    {/* submit */}
                    <SubmitBtn title="Save needs-attention + note">
                      Save
                    </SubmitBtn>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
