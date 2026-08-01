"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Link2, SlidersHorizontal, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getWorkspace } from "@/features/account/api";
import { cn } from "@/lib/cn";
import { FOOTER_NAV, LIBRARY_NAV, PRIMARY_NAV } from "@/shared/constants/navigation";
import { NavItem } from "./nav-item";
import { NavSection } from "./nav-section";
import { WorkspaceSwitcher } from "./workspace-switcher";

const SETTINGS_NAV = [
  { label: "Account", icon: User, href: "/settings/account" },
  { label: "Billing & Usage", icon: CreditCard, href: "/settings/billing" },
  { label: "Connected accounts", icon: Link2, href: "/settings/connections" },
  { label: "Clip defaults", icon: SlidersHorizontal, href: "/settings/defaults" },
];

// `recentSlot` is injected by the layout so this shell stays feature-agnostic.
// `collapsed`/`onToggleCollapse` power the editor's icon-only rail (home layout omits them).
export function AppSidebar({
  recentSlot,
  collapsed = false,
  onToggleCollapse,
}: {
  recentSlot?: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { data: workspace } = useQuery({ queryKey: ["workspace"], queryFn: getWorkspace });
  const wsName = workspace?.name ?? "Workspace";

  // Settings takes over the whole sidebar: back arrow + settings tabs.
  if (pathname.startsWith("/settings")) {
    return (
      <aside className="flex h-full w-52 flex-col">
        <Link
          href="/dashboard"
          className="mx-2 mt-3 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <p className="mt-4 px-5 text-lg font-bold tracking-tight">Settings</p>
        <nav className="mt-3 flex-1 space-y-0.5 px-2">
          {SETTINGS_NAV.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} />
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className={cn("flex h-full flex-col transition-[width] duration-200", collapsed ? "w-16" : "w-52")}>
      <WorkspaceSwitcher name={wsName} initial={wsName[0]?.toUpperCase() ?? "W"} collapsed={collapsed} onToggle={onToggleCollapse} />

      <nav className="flex-1 overflow-y-auto px-2 [scrollbar-width:thin]">
        <div className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavItem key={item.label} {...item} active={pathname === item.href} collapsed={collapsed} />
          ))}
        </div>

        <NavSection title="Library" collapsed={collapsed}>
          {LIBRARY_NAV.map((item) => (
            <NavItem key={item.label} {...item} active={pathname === item.href} collapsed={collapsed} />
          ))}
        </NavSection>

        {collapsed ? null : recentSlot}
      </nav>

      <div className="space-y-0.5 px-2 py-3">
        {FOOTER_NAV.map((item) => (
          <NavItem key={item.label} {...item} active={pathname === item.href} collapsed={collapsed} />
        ))}
      </div>
    </aside>
  );
}
