"use client";

import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { BillingPeriodToggle } from "./billing-period-toggle";
import { UpgradeCta } from "./upgrade-cta";
import { planPricing, tierId } from "../lib/pricing";
import { PLANS, STUDIO_SIZES } from "../lib/plans";
import { useBillingStore } from "../stores/use-billing-store";
import type { BillingPeriod, Plan } from "../types";

// App-themed upgrade popup. Mounted once (app layout) and opened from anywhere
// via the billing store's openUpgrade() — no navigation to /pricing needed.
export function PricingModal() {
  const { upgradeOpen, upgradeReason, closeUpgrade, period, setPeriod } = useBillingStore();
  const [studioSize, setStudioSize] = useState(0);

  return (
    <Dialog open={upgradeOpen} onOpenChange={(o) => !o && closeUpgrade()}>
      <DialogContent
        showCloseButton
        // `dark` because the dialog portals to <body>, outside the app's .dark wrapper.
        className="dark max-h-[90vh] overflow-y-auto border-border bg-card p-6 text-foreground sm:max-w-5xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-300">
            <Sparkles className="size-3.5" /> Upgrade
          </span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
            {upgradeReason ?? "Unlock more credits & premium models"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Pick a plan — credits land instantly, cancel anytime.
          </p>
          <div className="mt-5 flex justify-center">
            <BillingPeriodToggle value={period} onChange={setPeriod} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => (
            <ModalPlanCard
              key={plan.id}
              plan={plan}
              period={period}
              studioSize={studioSize}
              onStudioSize={setStudioSize}
            />
          ))}
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Prices in USD. Yearly plans are billed once a year.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function ModalPlanCard({
  plan,
  period,
  studioSize,
  onStudioSize,
}: {
  plan: Plan;
  period: BillingPeriod;
  studioSize: number;
  onStudioSize: (i: number) => void;
}) {
  const isStudio = plan.id === "studio";
  const size = STUDIO_SIZES[studioSize];
  const mult = isStudio ? size.mult : 1;
  const { perMonth, yearlyTotal, credits } = planPricing(plan, period, mult);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl p-5",
        plan.popular ? "border-2 border-[#14b8a6] bg-[#14b8a6]/[0.04]" : "border border-border bg-[#151821]",
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-base font-bold">{plan.name}</h3>
        {plan.popular ? (
          <span className="rounded bg-[#14b8a6] px-1.5 py-0.5 text-[10px] font-bold text-white">POPULAR</span>
        ) : null}
      </div>
      <p className="mb-4 min-h-8 text-xs text-muted-foreground">{plan.tagline}</p>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold">${perMonth.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">/mo</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {period === "yearly" ? `$${yearlyTotal.toLocaleString()} billed yearly` : "Billed monthly · cancel anytime"}
      </p>

      {isStudio ? (
        <div className="mt-4 flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {STUDIO_SIZES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onStudioSize(i)}
              className={cn(
                "flex-1 rounded-full px-2 py-1 text-xs font-medium transition-colors",
                i === studioSize ? "bg-[#14b8a6] text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      <UpgradeCta
        tier={tierId(plan, period, size.label)}
        className={cn(
          "mt-4 flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-90",
          plan.popular ? "bg-[#14b8a6] text-white" : "bg-white/10 text-foreground",
        )}
      >
        Choose {plan.name}
      </UpgradeCta>

      <ul className="mt-5 space-y-2.5 border-t border-border pt-4 text-xs">
        {[`${credits.toLocaleString()} credits / month`, ...plan.features.slice(1)].map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-[#14b8a6]" />
            <span className="text-foreground/90">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
