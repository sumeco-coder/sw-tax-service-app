"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <select
      value={theme ?? "system"}
      onChange={(e) => setTheme(e.target.value)}
      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
      aria-label="Theme"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
