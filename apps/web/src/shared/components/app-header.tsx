import Link from "next/link";
import { ProfileMenu } from "./profile-menu";

export function AppHeader() {
  return (
    <header className="relative z-40 flex h-14 w-full shrink-0 items-center border-b border-white/[0.08] bg-[#242832] px-5 backdrop-blur-lg select-none">
      {/* Brand */}
      <Link href="/dashboard" className="group flex shrink-0 items-center gap-2.5">
        <svg viewBox="0 0 32 32" className="size-8 transition-transform group-hover:scale-105" aria-hidden="true" focusable="false">
          <rect width="32" height="32" rx="9" fill="#14b8a6" />
          <g fill="#ffffff" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M11.5 9.8 V22.2 L16.9 19.3 V12.7 Z" />
            <path d="M19.3 14.2 V20.2 L24.6 17.2 Z" />
          </g>
        </svg>
        <span className="text-lg font-bold tracking-tight text-white">Riocut</span>
      </Link>

      {/* Page-specific actions (e.g. the editor portals its title / undo / export here). */}
      <div id="app-header-slot" className="flex min-w-0 flex-1 items-center pl-5" />

      {/* Account: identity, credits, upgrade, and settings links. */}
      <ProfileMenu />
    </header>
  );
}
