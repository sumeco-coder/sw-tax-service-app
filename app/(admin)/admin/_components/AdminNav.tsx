"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Mail,
  Megaphone,
  Settings,
  CalendarClock, // ✅ add this
} from "lucide-react";

const BRAND = {
  primary: "#E00040",
  accent: "#B04020",
};

const nav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Waitlist", href: "/admin/waitlist", icon: Users },
  { label: "Email", href: "/admin/email", icon: Mail },
  { label: "Scheduler", href: "/admin/email/scheduler", icon: CalendarClock }, // ✅ keep here (near Email)
  { label: "Social", href: "/admin/social", icon: Megaphone },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Campaigns", href: "/admin/email/campaigns", icon: Mail },
  { label: "Analytics", href: "/admin/analytics", icon: Mail }

];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  // ✅ matches "/admin/email" and "/admin/email/anything"
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={[
              "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition",
              active
                ? "text-white shadow-sm"
                : "text-white/80 hover:bg-white/10 hover:text-white",
            ].join(" ")}
            style={
              active
                ? {
                    background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent})`,
                  }
                : undefined
            }
          >
            <Icon
              className={
                active
                  ? "h-4 w-4 text-white"
                  : "h-4 w-4 text-white/70 group-hover:text-white"
              }
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
