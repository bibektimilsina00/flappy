import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { BRAND, PRICING } from "./content";
import { Button } from "./ui";

export function PricingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
      {PRICING.map((tier) => (
        <div
          key={tier.name}
          className={cn(
            "relative flex flex-col rounded-2xl border p-7",
            tier.highlight ? "border-mk-accent bg-mk-surface" : "border-mk-border bg-mk-surface",
          )}
        >
          {tier.highlight ? (
            <span className="absolute -top-3 left-7 rounded-full bg-mk-accent px-3 py-1 text-xs font-semibold text-mk-accentfg">Most popular</span>
          ) : null}
          <h3 className="text-lg font-semibold text-mk-fg">{tier.name}</h3>
          <div className="mt-3 flex items-end gap-1.5">
            <span className="text-4xl font-semibold tracking-tight text-mk-fg">{tier.price}</span>
            <span className="pb-1 text-sm text-mk-muted">/ {tier.period}</span>
          </div>
          <p className="mt-3 text-sm text-mk-muted">{tier.blurb}</p>
          <Button href={tier.name === "Studio" ? "/pricing" : BRAND.appUrl} variant={tier.highlight ? "primary" : "secondary"} className="mt-6 w-full">
            {tier.cta}
          </Button>
          <ul className="mt-7 flex flex-col gap-3 border-t border-mk-border pt-6">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <Check className={cn("mt-0.5 size-4 shrink-0", tier.highlight ? "text-mk-accent" : "text-mk-muted")} />
                <span className="text-mk-fg/90">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
