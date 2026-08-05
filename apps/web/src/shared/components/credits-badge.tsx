"use client";

import { Crown, Gem, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBalance } from "@/features/billing";
import { cn } from "@/lib/cn";

// Floating credit balance — glowing glass badge with Gem diamond icon & plan pill.
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
        "group pointer-events-auto fixed right-5 top-4 z-50 flex items-center gap-2 rounded-full p-1.5 pl-2.5 pr-3 transition-all duration-200 shadow-2xl backdrop-blur-md",
        low
          ? "border border-amber-500/40 bg-[#18120a]/90 hover:border-amber-400/80 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]"
          : "border border-white/12 bg-[#121212]/90 hover:border-teal-400/50 hover:bg-[#161616]/95 shadow-[0_0_25px_-5px_rgba(0,0,0,0.8)]",
      )}
    >
      {/* Glowing Diamond Badge */}
      <span
        className={cn(
          "relative grid size-6 place-items-center rounded-full text-black shadow-sm transition-transform duration-200 group-hover:scale-105",
          low
            ? "bg-gradient-to-br from-amber-300 to-amber-500 shadow-amber-500/30"
            : "bg-gradient-to-br from-teal-300 via-teal-400 to-emerald-500 shadow-teal-400/30",
        )}
      >
        <Gem className="size-3.5 fill-black text-black stroke-[2.5]" />
      </span>

      {/* Credit Counter */}
      <div className="flex items-center gap-1.5 font-sans">
        <span className="text-[13px] font-bold tabular-nums tracking-tight text-white">
          {amount}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground/80 group-hover:text-muted-foreground">
          credits
        </span>
      </div>

      {/* Plan Badge or Upgrade Pill */}
      {isFree ? (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-teal-400/30 bg-teal-400/10 px-2 py-0.5 text-[10px] font-bold text-teal-300 transition-all group-hover:bg-teal-400 group-hover:text-black">
          <Sparkles className="size-2.5" />
          <span>FREE</span>
        </span>
      ) : (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
          <Crown className="size-2.5" />
          <span className="uppercase">{data.plan.replace("_", " ")}</span>
        </span>
      )}
    </Link>
  );
}
