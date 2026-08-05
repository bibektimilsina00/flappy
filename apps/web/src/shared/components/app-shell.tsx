"use client";

import { useState } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar/app-sidebar";
import { CreditsBadge } from "./credits-badge";

/**
 * Persistent app shell: Top Navbar (AppHeader) + Side Rail (AppSidebar) + Main View.
 * The layout stays mounted across navigation without flicker.
 */
export function AppShell({ children, recentSlot }: { children: React.ReactNode; recentSlot?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0e0f17] text-foreground">
      <AppHeader />
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        <div className="shrink-0">
          <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} recentSlot={recentSlot} />
        </div>
        <main className="m-2 min-w-0 flex-1 overflow-auto rounded-xl border border-white/[0.08] bg-[#141624] shadow-2xl">
          {children}
        </main>
      </div>
      <CreditsBadge />
    </div>
  );
}
