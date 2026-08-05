"use client";

import {
  Bell,
  ChevronDown,
  LogOut,
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

        {/* Notifications Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid size-8 place-items-center rounded-lg border border-white/10 bg-[#161824] text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
        >
          <Bell className="size-4" />
          <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#14b8a6] text-[10px] font-bold text-white shadow-sm">
            3
          </span>
        </button>

        {/* User Profile Avatar & Menu */}
        <div ref={userRef} className="relative">
          <button
            type="button"
            onClick={() => setUserOpen((v) => !v)}
            aria-label="User account menu"
            className="flex items-center gap-1.5 rounded-full p-0.5 transition-opacity hover:opacity-90"
          >
            <div className="grid size-8 place-items-center overflow-hidden rounded-full border border-teal-400/40 bg-[#14b8a6] text-xs font-bold text-white shadow-md">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name ?? "Avatar"}
                  className="size-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", userOpen && "rotate-180")} />
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
