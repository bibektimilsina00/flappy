"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar/app-sidebar";
import { CreditsBadge } from "./credits-badge";

/**
 * Persistent app shell: Top Navbar (AppHeader) + Side Rail (AppSidebar) + Main View.
 * The layout stays mounted across navigation without flicker.
 */
export function AppShell({ children, recentSlot }: { children: React.ReactNode; recentSlot?: React.ReactNode }) {
  // Full-screen tools manage their own inner cards — let them fill the canvas
  // flush instead of nesting inside the shell's rounded card (a doubled border).
  const path = usePathname();
  const bleed = ["/video-editor", "/canvas", "/clips"].some((p) => path?.startsWith(p));
  // The global sidebar defaults collapsed inside those tools (they have their own
  // side panel); entering the group re-collapses it, but the user can reopen it.
  const [collapsed, setCollapsed] = useState(bleed);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run only when the tool/non-tool group flips
  useEffect(() => setCollapsed(bleed), [bleed]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#151821] text-foreground">
      <AppHeader />
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        <div className="shrink-0 bg-[#242832]">
          <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} recentSlot={recentSlot} />
        </div>
        <main
          className={cn(
            "min-w-0 flex-1 overflow-auto bg-[#13161f]",
            bleed ? "" : "m-2 rounded-xl border border-white/[0.08] shadow-2xl",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
