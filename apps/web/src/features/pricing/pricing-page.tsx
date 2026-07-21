"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { type Plan, PLANS, STUDIO_SIZES } from "./plans";

const GOLD = "#c2b558";

export function PricingPage() {
  const [yearly, setYearly] = useState(true);
  const [studioSize, setStudioSize] = useState(0);

  return (
    <div className="dark min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Plans built for AI creators
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              More credits, stronger models, faster generation and commercial rights — for shorts,
              ads, films, animation and social videos.
            </p>
          </div>
          <BillingToggle yearly={yearly} onChange={setYearly} />
        </div>

        {/* Cards */}
        <div className="grid gap-4 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              yearly={yearly}
              studioSize={studioSize}
              onStudioSize={setStudioSize}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BillingToggle({ yearly, onChange }: { yearly: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-1 self-start rounded-full border border-border bg-card p-1">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
          !yearly ? "bg-secondary text-foreground" : "text-muted-foreground",
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
          yearly ? "bg-secondary text-foreground" : "text-muted-foreground",
        )}
      >
        Yearly
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-black"
          style={{ background: GOLD }}
        >
          -60%
        </span>
      </button>
    </div>
  );
}

function PlanCard({
  plan,
  yearly,
  studioSize,
  onStudioSize,
}: {
  plan: Plan;
  yearly: boolean;
  studioSize: number;
  onStudioSize: (i: number) => void;
}) {
  const isStudio = plan.id === "studio";
  const mult = isStudio ? STUDIO_SIZES[studioSize].mult : 1;

  const price = (yearly ? plan.yearlyMonthly : plan.monthly) * mult;
  const yearlyTotal = plan.yearlyTotal * mult;
  const savePerYear = plan.monthly * 12 * mult - yearlyTotal;

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-card p-6",
        plan.popular ? "border-2" : "border-border",
      )}
      style={plan.popular ? { borderColor: GOLD } : undefined}
    >
      {/* Name */}
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        {plan.popular ? (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold text-black"
            style={{ background: GOLD }}
          >
            POPULAR
          </span>
        ) : null}
      </div>
      <p className="mb-5 min-h-10 text-sm text-muted-foreground">{plan.tagline}</p>

      {/* Price */}
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-4xl font-bold">${price}</span>
        <span className="text-muted-foreground">/month</span>
        {yearly ? (
          <span className="text-sm text-muted-foreground/60 line-through">${plan.monthly * mult}</span>
        ) : null}
      </div>
      {yearly ? (
        <>
          <div className="mb-1">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-sm font-medium">
              ${yearlyTotal}
            </span>{" "}
            <span className="text-sm text-muted-foreground">billed yearly</span>
          </div>
          <p className="text-sm font-medium" style={{ color: GOLD }}>
            Annual plan {plan.offPct}% off · Save ${savePerYear.toLocaleString()}/year
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Billed monthly · cancel anytime</p>
      )}

      {/* Studio size slider */}
      {isStudio ? (
        <div className="mt-5 flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-1">
          {STUDIO_SIZES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onStudioSize(i)}
              className={cn(
                "flex-1 rounded-full px-2 py-1 text-xs font-medium transition-colors",
                i === studioSize ? "text-black" : "text-muted-foreground",
              )}
              style={i === studioSize ? { background: GOLD } : undefined}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* CTA */}
      <button
        type="button"
        className={cn(
          "mt-5 w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-90",
          plan.popular ? "text-black" : "bg-secondary text-foreground",
        )}
        style={plan.popular ? { background: GOLD } : undefined}
      >
        Buy Now
      </button>

      {/* Features */}
      <ul className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
        {(isStudio && studioSize > 0
          ? [`${(85000 * mult).toLocaleString()} credits / month`, ...plan.features.slice(1)]
          : plan.features
        ).map((f) => (
          <li key={f} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0" style={{ color: GOLD }} />
            <span className="text-foreground/90">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
