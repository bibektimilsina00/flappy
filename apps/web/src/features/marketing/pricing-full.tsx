"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { type Plan, PLANS, STUDIO_SIZES } from "@/features/pricing/plans";
import { cn } from "@/lib/cn";
import { BRAND } from "./content";

// Recolored port of the in-app pricing (same PLANS data) into the marketing theme.
export function MarketingPricing() {
  const [yearly, setYearly] = useState(true);
  const [studioSize, setStudioSize] = useState(0);

  return (
    <div>
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-mk-accent">Pricing</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-mk-fg md:text-5xl">Plans built for AI creators</h1>
          <p className="mt-3 max-w-2xl text-mk-muted">
            More credits, stronger models, faster generation and commercial rights — for shorts, ads, films, animation and social videos.
          </p>
        </div>
        <BillingToggle yearly={yearly} onChange={setYearly} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} yearly={yearly} studioSize={studioSize} onStudioSize={setStudioSize} />
        ))}
      </div>
    </div>
  );
}

function BillingToggle({ yearly, onChange }: { yearly: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-1 self-start rounded-full border border-mk-border bg-mk-surface p-1">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors", !yearly ? "bg-mk-surface2 text-mk-fg" : "text-mk-muted")}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn("flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors", yearly ? "bg-mk-surface2 text-mk-fg" : "text-mk-muted")}
      >
        Yearly
        <span className="rounded-full bg-mk-accent px-1.5 py-0.5 text-[10px] font-semibold text-mk-accentfg">-60%</span>
      </button>
    </div>
  );
}

function PlanCard({ plan, yearly, studioSize, onStudioSize }: { plan: Plan; yearly: boolean; studioSize: number; onStudioSize: (i: number) => void }) {
  const isStudio = plan.id === "studio";
  const mult = isStudio ? STUDIO_SIZES[studioSize].mult : 1;
  const price = (yearly ? plan.yearlyMonthly : plan.monthly) * mult;
  const yearlyTotal = plan.yearlyTotal * mult;
  const savePerYear = plan.monthly * 12 * mult - yearlyTotal;

  return (
    <div className={cn("flex flex-col rounded-2xl bg-mk-surface p-6", plan.popular ? "border-2 border-mk-accent" : "border border-mk-border")}>
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-mk-fg">{plan.name}</h3>
        {plan.popular ? <span className="rounded bg-mk-accent px-1.5 py-0.5 text-[10px] font-bold text-mk-accentfg">POPULAR</span> : null}
      </div>
      <p className="mb-5 min-h-10 text-sm text-mk-muted">{plan.tagline}</p>

      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-mk-fg">${price}</span>
        <span className="text-mk-muted">/month</span>
        {yearly ? <span className="text-sm text-mk-faint line-through">${plan.monthly * mult}</span> : null}
      </div>
      {yearly ? (
        <>
          <div className="mb-1">
            <span className="rounded-full bg-mk-surface2 px-2 py-0.5 text-sm font-medium text-mk-fg">${yearlyTotal}</span>{" "}
            <span className="text-sm text-mk-muted">billed yearly</span>
          </div>
          <p className="text-sm font-medium text-mk-accent">
            Annual plan {plan.offPct}% off · Save ${savePerYear.toLocaleString()}/year
          </p>
        </>
      ) : (
        <p className="text-sm text-mk-muted">Billed monthly · cancel anytime</p>
      )}

      {isStudio ? (
        <div className="mt-5 flex items-center gap-1 rounded-full border border-mk-border bg-mk-bg p-1">
          {STUDIO_SIZES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onStudioSize(i)}
              className={cn("flex-1 rounded-full px-2 py-1 text-xs font-medium transition-colors", i === studioSize ? "bg-mk-accent text-mk-accentfg" : "text-mk-muted")}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      <a
        href={BRAND.appUrl}
        className={cn(
          "mt-5 w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-opacity hover:opacity-90",
          plan.popular ? "bg-mk-accent text-mk-accentfg" : "bg-mk-surface2 text-mk-fg",
        )}
      >
        Get started
      </a>

      <ul className="mt-6 space-y-3 border-t border-mk-border pt-5 text-sm">
        {(isStudio && studioSize > 0 ? [`${(85000 * mult).toLocaleString()} credits / month`, ...plan.features.slice(1)] : plan.features).map((f) => (
          <li key={f} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-mk-accent" />
            <span className="text-mk-fg/90">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
