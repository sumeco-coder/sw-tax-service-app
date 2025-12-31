"use client";

import React from "react";

export function Card({
  title,
  children,
  footer,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "h-full flex flex-col",
        "rounded-xl bg-white shadow-md ring-1 ring-gray-200",
        "p-4",
        className,
      ].join(" ")}
    >
      {title && (
        <div className="mb-3 text-sm font-semibold text-gray-900">{title}</div>
      )}

      <div className="flex-1">{children}</div>

      {footer && <div className="mt-4 border-t pt-3 text-sm">{footer}</div>}
    </div>
  );
}
