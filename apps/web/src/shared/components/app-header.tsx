"use client";

import {
  Bell,
  ChevronDown,
  CircleHelp,
  Compass,
  Images,
  LogOut,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/stores/session";
import { cn } from "@/lib/cn";

const NAV_TABS = [
  { label: "Home", href: "/dashboard" },
  { label: "Clips", href: "/clips" },
  { label: "Design", href: "/templates" },
  { label: "Projects", href: "/projects" },
  { label: "Canvas", href: "/canvas" },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSession((s) => s.user);
  const clearSession = useSession((s) => s.clear);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const moreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const initial = user?.name ? user.name[0]?.toUpperCase() : "U";

  return (
    <header className="relative z-40 flex h-14 w-full shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#242832] px-5 backdrop-blur-lg select-none">
      {/* Left: Brand Logo & Navigation */}
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="group flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-500 shadow-md shadow-cyan-500/20 text-black transition-transform group-hover:scale-105">
            <svg
              className="size-4 text-black fill-black ml-0.5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Riocut<span className="text-teal-400">.com</span>
          </span>
        </Link>

        {/* Navigation Tabs */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_TABS.map((tab) => {
            const active = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(`${tab.href}/`));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative px-3 py-4 text-sm font-medium transition-colors hover:text-white",
                  active
                    ? "font-semibold text-white"
                    : "text-muted-foreground hover:text-white"
                )}
              >
                {tab.label}
                {active ? (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
                ) : null}
              </Link>
            );
          })}

          {/* More Dropdown */}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="flex items-center gap-1 px-3 py-4 text-sm font-medium text-muted-foreground transition-colors hover:text-white"
            >
              More <ChevronDown className={cn("size-3.5 transition-transform", moreOpen && "rotate-180")} />
            </button>

            {moreOpen ? (
              <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-white/10 bg-[#161824] p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100">
                <Link
                  href="/assets"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Images className="size-4" /> Assets Library
                </Link>
                <Link
                  href="/explore"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Compass className="size-4" /> Explore & Discover
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Settings className="size-4" /> Settings
                </Link>
                <Link
                  href="/help"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
                >
                  <CircleHelp className="size-4" /> Help & Support
                </Link>
              </div>
            ) : null}
          </div>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <form onSubmit={onSearchSubmit} className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects, clips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-44 rounded-lg border border-white/10 bg-[#161824] pl-8 pr-3 text-xs text-white placeholder-muted-foreground/60 transition-all focus:w-60 focus:border-teal-400/50 focus:outline-none"
          />
        </form>

        {/* Notifications Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid size-8 place-items-center rounded-lg border border-white/10 bg-[#161824] text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
        >
          <Bell className="size-4" />
          <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-purple-600 text-[10px] font-bold text-white shadow-sm">
            3
          </span>
        </button>

        {/* Primary Action Button (Share / Export) */}
        <button
          type="button"
          onClick={() => router.push("/clips")}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-purple-600/30 transition-all hover:brightness-110 active:scale-95"
        >
          <Share2 className="size-3.5" />
          <span>Share</span>
        </button>

        {/* User Profile Avatar & Menu */}
        <div ref={userRef} className="relative">
          <button
            type="button"
            onClick={() => setUserOpen((v) => !v)}
            className="grid size-8 place-items-center rounded-full border border-white/20 bg-gradient-to-tr from-purple-700 to-indigo-500 text-xs font-bold text-white shadow-md transition-transform hover:scale-105"
          >
            {initial}
          </button>

          {userOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#161824] p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100">
              <div className="border-b border-white/10 px-3 py-2">
                <p className="truncate text-xs font-bold text-white">{user?.name ?? "User"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings/account"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
                >
                  <User className="size-4" /> Account Profile
                </Link>
                <Link
                  href="/settings/billing"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
                >
                  <SlidersHorizontal className="size-4" /> Billing & Plan
                </Link>
              </div>
              <div className="border-t border-white/10 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    clearSession();
                    setUserOpen(false);
                    router.push("/login");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="size-4" /> Log out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
