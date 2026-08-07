import type { BillingPeriod, Plan } from "../types";

// Per-month price to display (yearly shows the annual total ÷ 12), the annual
// total, and the tier string checkout expects for the chosen plan + period.
export function planPricing(plan: Plan, period: BillingPeriod, mult = 1) {
  const monthlyPrice = plan.monthly * mult;
  const yearlyTotal = plan.yearly * mult;
  return {
    perMonth: period === "yearly" ? Math.round(yearlyTotal / 12) : monthlyPrice,
    monthlyPrice,
    yearlyTotal,
    credits: plan.credits * mult,
  };
}

// e.g. "pro", "pro_yearly", "studio_max", "studio_max_yearly".
export function tierId(plan: Plan, period: BillingPeriod, studioLabel?: string) {
  const base = plan.id === "studio" ? `studio_${(studioLabel ?? "s").toLowerCase()}` : plan.id;
  return period === "yearly" ? `${base}_yearly` : base;
}

// Months free on the annual plan (for the "Save N months" badge).
export const YEARLY_MONTHS_FREE = 2;
