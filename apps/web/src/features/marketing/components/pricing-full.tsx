"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { type Plan, PLANS, STUDIO_SIZES, UpgradeCta } from "@/features/billing";
import { cn } from "@/lib/cn";
import { BRAND } from "../lib/content";

// Marketing-themed render of the shared PLANS ladder. Monthly billing only.
export function MarketingPricing() {
  const [studioSize, setStudioSize] = useState(0);

  return (
    <div>
      <div className="mb-10">
        <p className="text-sm font-semibold text-mk-accent">Pricing</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-mk-fg md:text-5xl">Plans built for AI creators</h1>
        <p className="mt-3 max-w-2xl text-mk-muted">
          More credits, stronger models, faster generation and longer sources — for shorts, ads, films, and social video.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} studioSize={studioSize} onStudioSize={setStudioSize} />
        ))}
      </div>
      <p className="mt-6 text-sm text-mk-muted">
        Also free forever: uploads &amp; non-YouTube links, 30-minute sources, 100 credits every month.{" "}
        <a href={BRAND.appUrl} className="text-mk-accent underline underline-offset-2">
          Start free
        </a>
      </p>
    </div>
  );
}

function PlanCard({ plan, studioSize, onStudioSize }: { plan: Plan; studioSize: number; onStudioSize: (i: number) => void }) {
  const isStudio = plan.id === "studio";
  const mult = isStudio ? STUDIO_SIZES[studioSize].mult : 1;
  const price = plan.monthly * mult;
  const credits = plan.credits * mult;

  return (
    <div className={cn("flex flex-col rounded-2xl bg-mk-surface p-6", plan.popular ? "border-2 border-mk-accent" : "border border-mk-border")}>
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-mk-fg">{plan.name}</h3>
        {plan.popular ? <span className="rounded bg-mk-accent px-1.5 py-0.5 text-[10px] font-bold text-mk-accentfg">POPULAR</span> : null}
      </div>
      <p className="mb-5 min-h-10 text-sm text-mk-muted">{plan.tagline}</p>

      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-mk-fg">${price.toLocaleString()}</span>
        <span className="text-mk-muted">/month</span>
      </div>
      <p className="text-sm text-mk-muted">Billed monthly · cancel anytime</p>

      {isStudio ? (
        <div className="mt-5 flex items-center gap-1 rounded-full border border-mk-border bg-mk-bg p-1">
          {STUDIO_SIZES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onStudioSize(i)}
              className={cn(
                "flex-1 rounded-full px-2 py-1 text-xs font-medium transition-colors",
                i === studioSize ? "bg-mk-accent text-mk-accentfg" : "text-mk-muted hover:text-mk-fg",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      <UpgradeCta
        tier={isStudio ? `studio_${STUDIO_SIZES[studioSize].label.toLowerCase()}` : plan.id}
        className={cn(
          "mt-5 flex w-full items-center justify-center rounded-lg py-2.5 text-center text-sm font-semibold transition-opacity hover:opacity-90",
          plan.popular ? "bg-mk-accent text-mk-accentfg" : "bg-mk-surface2 text-mk-fg",
        )}
      >
        Get started
      </UpgradeCta>

      <ul className="mt-6 space-y-3 border-t border-mk-border pt-5 text-sm">
        {[`${credits.toLocaleString()} credits / month`, ...plan.features.slice(1)].map((f) => (
          <li key={f} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-mk-accent" />
            <span className="text-mk-fg/90">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
