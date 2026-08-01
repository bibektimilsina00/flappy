"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { useBalance } from "@/features/billing";
import { cn } from "@/lib/cn";

// Floating credit balance — icon + number, quiet until you need it.
// Turns amber when low so running dry is never a surprise.
export function CreditsBadge() {
  const { data } = useBalance();
  if (!data) return null;
  const low = data.balance < 25;
  const amount =
    data.balance >= 10000
      ? `${(data.balance / 1000).toFixed(1).replace(/\.0$/, "")}k`
      : Math.floor(data.balance).toLocaleString();

  return (
    <Link
      href="/settings/billing"
      title={`${Math.floor(data.balance).toLocaleString()} credits · ${
        data.plan === "free" ? "Free plan — click to upgrade" : `${data.plan.replace("_", " ")} plan`
      }`}
      className={cn(
        "pointer-events-auto fixed right-5 top-4 z-50 flex items-center gap-2 rounded-full",
        "border bg-[#161616]/90 py-1.5 pl-2.5 pr-3.5 shadow-lg backdrop-blur transition-all duration-150",
        low
          ? "border-amber-400/40 hover:border-amber-300/70"
          : "border-white/[0.08] hover:border-white/25",
      )}
    >
      <span
        className={cn(
          "grid size-5 place-items-center rounded-full",
          low ? "bg-amber-400/15" : "bg-teal-400/12",
        )}
      >
        <Zap className={cn("size-3", low ? "text-amber-300" : "text-teal-300")} />
      </span>
      <span className="text-[13px] font-semibold tabular-nums tracking-tight text-foreground/90">
        {amount}
      </span>
    </Link>
  );
}
