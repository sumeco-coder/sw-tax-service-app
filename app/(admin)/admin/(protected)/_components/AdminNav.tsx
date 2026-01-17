"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderOpen,
  ClipboardList,
  MessagesSquare,
  CreditCard,
  CalendarClock,
  Mail,
  Megaphone,
  BarChart3,
  Settings,
  UserCog,
  Building2,
  ShieldCheck,
  PlugZap,
  Wrench,
  LifeBuoy,
  Calculator,
  ChevronDown,
} from "lucide-react";

const BRAND = {
  primary: "#E00040",
  accent: "#B04020",
};

type NavItem = {
  label: string;
  href: string;
  icon: any;
};

type NavGroup = {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
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
}

function CollapsibleGroup({
  label,
  items,
  pathname,
  onNavigate,
  defaultOpen = false,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  defaultOpen?: boolean;
}) {
  const anyActive = items.some((it) => isActivePath(pathname, it.href));
  const [open, setOpen] = useState(defaultOpen || anyActive);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide transition",
          anyActive ? "text-white" : "text-white/70 hover:text-white",
        ].join(" ")}
      >
        <span>{label}</span>
        <ChevronDown
          className={[
            "h-4 w-4 transition-transform",
            open ? "rotate-180" : "rotate-0",
            anyActive ? "text-white" : "text-white/70",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div className="mt-1 flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  // ✅ Main (6–8 items)
  const mainNav: NavItem[] = useMemo(
    () => [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Clients", href: "/admin/clients", icon: Users },
      { label: "Returns", href: "/admin/returns", icon: FileText },
      { label: "Documents", href: "/admin/documents", icon: FolderOpen },
      { label: "Tasks", href: "/admin/tasks", icon: ClipboardList },
      { label: "Messages", href: "/admin/messages", icon: MessagesSquare },
      { label: "Billing", href: "/admin/billing", icon: CreditCard },
      {
        label: "Appointments",
        href: "/admin/appointments",
        icon: CalendarClock,
      },
    ],
    []
  );

  // ✅ Leads group (new)
  const leadsNav: NavItem[] = useMemo(
    () => [
      { label: "Leads (Emails)", href: "/admin/leads/emails", icon: Mail },
      { label: "Tax Calculator Leads", href: "/admin/leads", icon: Calculator },
    ],
    []
  );

  const analyticsNav: NavItem[] = useMemo(
    () => [
      { label: "Overview", href: "/admin/analytics", icon: BarChart3 },
      {
        label: "Tax Knowledge",
        href: "/admin/analytics/tax-knowledge",
        icon: FileText,
      },
    ],
    []
  );

  const reportsNav: NavItem[] = useMemo(
  () => [
    { label: "Reports Hub", href: "/admin/reports", icon: BarChart3 },
    { label: "Payments", href: "/admin/reports/payments", icon: CreditCard },
    { label: "Returns", href: "/admin/reports/returns", icon: FileText },
    { label: "Clients", href: "/admin/reports/clients", icon: Users },
    { label: "Leads", href: "/admin/reports/leads", icon: Mail },
    { label: "Staff", href: "/admin/reports/staff", icon: UserCog },
    { label: "Compliance", href: "/admin/reports/compliance", icon: ShieldCheck },
    { label: "Exports", href: "/admin/reports/exports", icon: FolderOpen },
  ],
  []
);


  // ✅ Marketing / Ops
  const marketingNav: NavItem[] = useMemo(
    () => [
      { label: "Waitlist", href: "/admin/waitlist", icon: Users },
      { label: "Email", href: "/admin/email", icon: Mail },
      { label: "Campaigns", href: "/admin/email/campaigns", icon: Mail },
      {
        label: "Scheduler",
        href: "/admin/email/scheduler",
        icon: CalendarClock,
      },
      { label: "Social", href: "/admin/social", icon: Megaphone },
      { label: "Tax Tools", href: "/admin/tax-tools/unlock", icon: Calculator },
    ],
    []
  );

  // ✅ Admin dropdown
  const adminNav: NavItem[] = useMemo(
    () => [
      { label: "Users & Roles", href: "/admin/users", icon: UserCog },
      { label: "Agencies", href: "/admin/agencies", icon: Building2 },
      { label: "Integrations", href: "/admin/integrations", icon: PlugZap },
      { label: "Compliance", href: "/admin/compliance", icon: ShieldCheck },
      { label: "System", href: "/admin/system", icon: Wrench },
      { label: "Support", href: "/admin/support", icon: LifeBuoy },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
    []
  );

  return (
    <nav className="flex flex-col gap-1">
      {/* Main */}
      {mainNav.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActivePath(pathname, item.href)}
          onNavigate={onNavigate}
        />
      ))}

      {/* Leads */}
      <CollapsibleGroup
        label="Leads"
        items={leadsNav}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      <CollapsibleGroup
  label="Reports"
  items={reportsNav}
  pathname={pathname}
  onNavigate={onNavigate}
/>


      {/* Marketing */}
      <CollapsibleGroup
        label="Marketing"
        items={marketingNav}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      <CollapsibleGroup
        label="Analytics"
        items={analyticsNav}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      {/* Admin */}
      <CollapsibleGroup
        label="Admin"
        items={adminNav}
        pathname={pathname}
        onNavigate={onNavigate}
      />
    </nav>
  );
}
