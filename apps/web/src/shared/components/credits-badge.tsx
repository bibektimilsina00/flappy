"use client";

import { Gem } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBalance } from "@/features/billing";
import { cn } from "@/lib/cn";

// Borderless, compact credit badge with Diamond icon.
export function CreditsBadge() {
  const pathname = usePathname();
  const { data } = useBalance();
  if (!data) return null;
  // Hidden on dashboard & video editor for now.
  if (!pathname || pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/video-editor")) return null;

  const low = data.balance < 25;
  const amount =
    data.balance >= 10000
      ? `${(data.balance / 1000).toFixed(1).replace(/\.0$/, "")}k`
      : Math.floor(data.balance).toLocaleString();

  return (
    <Link
      href={data.plan === "free" ? "/pricing" : "/settings/billing"}
      title={`${Math.floor(data.balance).toLocaleString()} credits available`}
      className={cn(
        "group pointer-events-auto fixed right-5 top-4 z-50 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md transition-all duration-150 shadow-sm",
        low
          ? "bg-amber-950/70 text-amber-300 hover:bg-amber-900/80"
          : "bg-[#161616]/80 text-foreground hover:bg-[#202020]",
      )}
    >
      <Gem className={cn("size-3.5 fill-current", low ? "text-amber-400" : "text-teal-400")} />
      <span className="tabular-nums font-bold tracking-tight text-white">{amount}</span>
      <span className="text-[11px] font-medium text-muted-foreground">credits</span>
    </Link>
  );
}
