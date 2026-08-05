"use client";

import { Gem } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBalance } from "@/features/billing";
import { cn } from "@/lib/cn";

// Compact, clean floating credit badge with Diamond icon & plan indicator.
export function CreditsBadge() {
  const pathname = usePathname();
  const { data } = useBalance();
  if (!data) return null;
  // Hidden in the video editor — its Export button sits in the same corner.
  if (pathname?.startsWith("/video-editor")) return null;

  const low = data.balance < 25;
  const isFree = data.plan === "free";
  const amount =
    data.balance >= 10000
      ? `${(data.balance / 1000).toFixed(1).replace(/\.0$/, "")}k`
      : Math.floor(data.balance).toLocaleString();

  return (
    <Link
      href={isFree ? "/pricing" : "/settings/billing"}
      title={`${Math.floor(data.balance).toLocaleString()} credits available · ${
        isFree ? "Free plan — click to upgrade" : `${data.plan.replace("_", " ")} plan`
      }`}
      className={cn(
        "group pointer-events-auto fixed right-5 top-4 z-50 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md transition-all duration-150 shadow-md",
        low
          ? "border border-amber-500/40 bg-amber-950/60 text-amber-300 hover:border-amber-400"
          : "border border-white/10 bg-[#161616]/80 text-foreground hover:border-teal-400/40 hover:bg-[#1a1a1a]",
      )}
    >
      <Gem className={cn("size-3.5 fill-current", low ? "text-amber-400" : "text-teal-400")} />
      <span className="tabular-nums font-bold tracking-tight text-white">{amount}</span>
      <span className="text-[10px] font-medium text-muted-foreground">credits</span>
      <span
        className={cn(
          "ml-0.5 rounded-full px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider transition-colors",
          isFree
            ? "bg-teal-400/10 text-teal-300 border border-teal-400/20 group-hover:bg-teal-400 group-hover:text-black"
            : "bg-amber-400/10 text-amber-300 border border-amber-400/20",
        )}
      >
        {isFree ? "Free" : data.plan.replace("_", " ")}
      </span>
    </Link>
  );
}
