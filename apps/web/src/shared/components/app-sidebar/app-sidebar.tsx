"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, CreditCard, Link2, SlidersHorizontal, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cloneElement, isValidElement } from "react";
import { getWorkspace } from "@/features/account";
import { cn } from "@/lib/cn";
import { FOOTER_NAV, LIBRARY_NAV, PRIMARY_NAV } from "@/shared/constants/navigation";
import { NavItem } from "./nav-item";
import { NavSection } from "./nav-section";
import { WorkspaceSwitcher } from "./workspace-switcher";

const SETTINGS_NAV: { group: string; items: { label: string; icon: typeof User; href: string }[] }[] = [
  { group: "Account", items: [{ label: "General", icon: User, href: "/settings/account" }] },
  {
    group: "Workspace",
    items: [
      { label: "Workspaces", icon: Building2, href: "/settings/workspaces" },
      { label: "Clip defaults", icon: SlidersHorizontal, href: "/settings/defaults" },
    ],
  },
  {
    group: "Subscription",
    items: [{ label: "Billing", icon: CreditCard, href: "/settings/billing" }],
  },
  {
    group: "Connections",
    items: [{ label: "Social accounts", icon: Link2, href: "/settings/connections" }],
  },
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
  const { user } = useUser();
  const { data: workspace } = useQuery({ queryKey: ["workspace"], queryFn: getWorkspace });
  const firstName = user?.firstName ?? user?.fullName?.split(" ")[0];
  const fallbackName = firstName ? `${firstName}'s Workspace` : "Personal Workspace";
  const wsName = workspace?.name || fallbackName;

  // Settings takes over the whole sidebar: switcher + back + grouped tabs.
  if (pathname.startsWith("/settings")) {
    return (
      <aside className="flex h-full w-52 flex-col bg-[#242832]">
        <WorkspaceSwitcher name={wsName} initial={wsName[0]?.toUpperCase() ?? "W"} />
        <Link
          href="/dashboard"
          className="mx-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <nav className="mt-2 flex-1 overflow-y-auto px-2 [scrollbar-width:thin]">
          {SETTINGS_NAV.map(({ group, items }) => (
            <div key={group} className="mb-4">
              <p className="px-3 pb-1 pt-2 text-xs text-muted-foreground/70">{group}</p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavItem key={item.href} {...item} active={pathname === item.href} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className={cn("flex h-full flex-col bg-[#242832] transition-[width] duration-200", collapsed ? "w-16" : "w-52")}>
      <WorkspaceSwitcher name={wsName} initial={wsName[0]?.toUpperCase() ?? "W"} collapsed={collapsed} onToggle={onToggleCollapse} />

      <nav className="flex-1 overflow-y-auto px-2 [scrollbar-width:thin]">
        <div className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavItem key={item.label} {...item} active={pathname === item.href} collapsed={collapsed} onActivate={onToggleCollapse} />
          ))}
        </div>

        <NavSection title="Library" collapsed={collapsed}>
          {LIBRARY_NAV.map((item) => (
            <NavItem key={item.label} {...item} active={pathname === item.href} collapsed={collapsed} onActivate={onToggleCollapse} />
          ))}
        </NavSection>

        {isValidElement<{ collapsed?: boolean }>(recentSlot)
          ? cloneElement(recentSlot, { collapsed })
          : recentSlot}
      </nav>

      <div className="space-y-0.5 px-2 py-3">
        {FOOTER_NAV.map((item) => (
          <NavItem key={item.label} {...item} active={pathname === item.href} collapsed={collapsed} onActivate={onToggleCollapse} />
        ))}
      </div>
    </aside>
  );
}
