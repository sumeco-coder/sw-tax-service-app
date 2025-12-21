// app/(admin)/admin/(protected)/email/_components/email-subnav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Campaigns", href: "/admin/email" },
  { label: "Logs", href: "/admin/email/logs" },

  // later:
  { label: "Lists", href: "/admin/email/lists", disabled: true },
  { label: "Unsubscribes", href: "/admin/email/unsubscribes", disabled: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin/email") return pathname === "/admin/email";
  return pathname.startsWith(href);
}

export default function EmailSubnav() {
  const pathname = usePathname();

  return (
    <div className="rounded-2xl border bg-white p-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const active = isActive(pathname, t.href);
          const disabled = !!t.disabled;

          const base =
            "inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold transition";
          const activeCls = "bg-slate-900 text-white";
          const idleCls =
            "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900";
          const disabledCls = "opacity-50 cursor-not-allowed hover:bg-transparent";

          if (disabled) {
            return (
              <span key={t.href} className={`${base} ${idleCls} ${disabledCls}`}>
                {t.label}
                <span className="ml-2 rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  SOON
                </span>
              </span>
            );
          }

          return (
            <Link
              key={t.href}
              href={t.href}
              className={`${base} ${active ? activeCls : idleCls}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
