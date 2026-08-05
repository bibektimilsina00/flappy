"use client";

import {
  Bell,
  LogOut,
  Search,
  SlidersHorizontal,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/stores/session";

export function AppHeader() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const clearSession = useSession((s) => s.clear);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
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
          <svg viewBox="0 0 32 32" className="size-8 transition-transform group-hover:scale-105" aria-hidden="true" focusable="false">
            <rect width="32" height="32" rx="9" fill="#14b8a6" />
            <g fill="#ffffff" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round">
              <path d="M11.5 9.8 V22.2 L16.9 19.3 V12.7 Z" />
              <path d="M19.3 14.2 V20.2 L24.6 17.2 Z" />
            </g>
          </svg>
          <span className="text-lg font-bold tracking-tight text-white">
            Riocut
          </span>
        </Link>
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
