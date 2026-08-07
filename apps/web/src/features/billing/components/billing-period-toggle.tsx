"use client";

import { cn } from "@/lib/cn";
import type { BillingPeriod } from "../types";
import { YEARLY_MONTHS_FREE } from "../lib/pricing";

// Monthly / Yearly pill switch shared by the pricing page and the upgrade popup.
export function BillingPeriodToggle({
  value,
  onChange,
  className,
}: {
  value: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
  className?: string;
}) {
  return (
    // Explicit colors (not theme tokens): this renders on the dark app popup AND
    // the marketing page, which has no `.dark` ancestor to darken the tokens.
    <div className={cn("inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1", className)}>
      {(["monthly", "yearly"] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
            value === p ? "bg-[#14b8a6] text-white shadow" : "text-white/55 hover:text-white",
          )}
        >
          {p === "monthly" ? "Monthly" : "Yearly"}
          {p === "yearly" ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                value === "yearly" ? "bg-black/20 text-white" : "bg-teal-400/15 text-teal-300",
              )}
            >
              {YEARLY_MONTHS_FREE} months free
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
