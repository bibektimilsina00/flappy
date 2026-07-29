"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { useBalance } from "@/features/billing";

// Floating credit balance — every generation and clip job spends credits.
export function CreditsBadge() {
  const { data } = useBalance();
  if (!data) return null;
  return (
    <Link
      href="/pricing"
      title={`${data.plan === "pro" ? "Pro" : "Free"} plan — top up or upgrade`}
      className="pointer-events-auto fixed right-5 top-4 z-50 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#1c1c1c]/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur transition-colors hover:border-teal-400/40 hover:text-teal-300"
    >
      <Zap className="size-3.5 text-teal-300" />
      {Math.floor(data.balance)} credits
    </Link>
  );
}
