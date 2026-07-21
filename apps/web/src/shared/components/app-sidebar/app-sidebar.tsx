"use client";

import { usePathname } from "next/navigation";
import { FOOTER_NAV, LIBRARY_NAV, PRIMARY_NAV } from "@/shared/constants/navigation";
import { NavItem } from "./nav-item";
import { NavSection } from "./nav-section";
import { WorkspaceSwitcher } from "./workspace-switcher";

// `recentSlot` is injected by the layout so this shell stays feature-agnostic.
export function AppSidebar({ recentSlot }: { recentSlot?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col">
      <WorkspaceSwitcher name="Bibek's Workspace" initial="B" />

      <nav className="flex-1 overflow-y-auto px-2">
        <div className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavItem key={item.label} {...item} active={pathname === item.href} />
          ))}
        </div>

        <NavSection title="Library">
          {LIBRARY_NAV.map((item) => (
            <NavItem key={item.label} {...item} active={pathname === item.href} />
          ))}
        </NavSection>

        {recentSlot}
      </nav>

      <div className="space-y-0.5 px-2 py-3">
        {FOOTER_NAV.map((item) => (
          <NavItem key={item.label} {...item} active={pathname === item.href} />
        ))}
      </div>
    </aside>
  );
}
