"use client";

import { useState } from "react";
import { AppSidebar } from "./app-sidebar/app-sidebar";

/**
 * Persistent app shell: the sidebar is rendered once here and stays mounted across
 * navigation (dashboard ⇄ editor ⇄ video editor). Only `children` (the content in
 * `main`) swaps — so the sidebar and its collapse state never flicker or reset.
 */
export function AppShell({ children, recentSlot }: { children: React.ReactNode; recentSlot?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full w-full">
      <div className="shrink-0">
        <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} recentSlot={recentSlot} />
      </div>
      <main className="m-2 min-w-0 flex-1 overflow-auto rounded-xl border border-border bg-background">{children}</main>
    </div>
  );
}
