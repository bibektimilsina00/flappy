"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { FOOTER_NAV, LIBRARY_NAV, PRIMARY_NAV } from "@/shared/constants/navigation";
import { NavItem } from "./nav-item";
import { NavSection } from "./nav-section";
import { WorkspaceSwitcher } from "./workspace-switcher";

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

  return (
    <aside className={cn("flex h-full flex-col transition-[width] duration-200", collapsed ? "w-16" : "w-52")}>
      <WorkspaceSwitcher name="Bibek's Workspace" initial="B" collapsed={collapsed} onToggle={onToggleCollapse} />

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
