"use client";

import { useCallback } from "react";

export default function InviteEmailPreviewButton() {
  const onClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const btn = e.currentTarget;
    const form = btn.closest("form") as HTMLFormElement | null;
    if (!form) return;

    const fd = new FormData(form);

    const to = String(fd.get("email") ?? "");
    const firstName = String(fd.get("firstName") ?? "");
    const next = String(fd.get("inviteNext") ?? "");

    const sp = new URLSearchParams();
    if (to) sp.set("to", to);
    if (firstName) sp.set("firstName", firstName);
    if (next) sp.set("next", next);

    window.open(`/admin/email/preview-invite?${sp.toString()}`, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
    >
      Preview email
    </button>
  );
}
