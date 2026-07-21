// Subscription tiers. Monthly = full price; Yearly = discounted effective /mo,
// billed once a year. Prices set a touch below comparable studios.
export interface Plan {
  id: string;
  name: string;
  tagline: string;
  monthly: number; // full monthly price
  yearlyMonthly: number; // effective /mo on the annual plan
  yearlyTotal: number; // charged once per year
  offPct: number; // annual discount vs monthly
  popular?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "plus",
    name: "Plus",
    tagline: "Best for occasional video production.",
    monthly: 8,
    yearlyMonthly: 5,
    yearlyTotal: 60,
    offPct: 37,
    features: [
      "5,000 credits / month",
      "≈ 833 images or 32 videos",
      "Access to premium models (Seedance, Nano Banana)",
      "2K / 4K HD video output",
      "Watermark-free exports",
      "10% bonus on credit packs",
      "Faster generation",
      "Automatic refund on failed generations",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Best for social media video and light ad production.",
    monthly: 30,
    yearlyMonthly: 18,
    yearlyTotal: 216,
    offPct: 40,
    features: [
      "18,000 credits / month",
      "≈ 3,000 images or 116 videos",
      "Everything in Plus",
      "20% bonus on credit packs",
      "Faster generation",
      "Commercial usage rights",
      "Invoice support",
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    tagline: "Built for professional productions.",
    monthly: 75,
    yearlyMonthly: 39,
    yearlyTotal: 468,
    offPct: 48,
    features: [
      "45,000 credits / month",
      "≈ 7,500 images or 290 videos",
      "Everything in Pro",
      "35% bonus on credit packs",
      "Priority generation speed",
      "Commercial usage rights",
      "Invoice support",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Best for series, films, and ads.",
    monthly: 140,
    yearlyMonthly: 55,
    yearlyTotal: 660,
    offPct: 60,
    popular: true,
    features: [
      "85,000 credits / month",
      "Everything in Ultra",
      "45% bonus on credit packs",
      "Commercial usage rights",
      "Invoice support",
    ],
  },
];

// Studio scales up via a size slider (credits × price grow together).
export const STUDIO_SIZES = [
  { label: "S", mult: 1 },
  { label: "M", mult: 2 },
  { label: "L", mult: 4 },
  { label: "XL", mult: 8 },
  { label: "MAX", mult: 16 },
];
