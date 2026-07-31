// Subscription tiers — the ONE frontend source of truth, mirroring the
// backend ladder in apps/api/app/features/billing/plans.py.
// Monthly billing only (yearly returns when yearly products exist).
export interface Plan {
  id: string;
  name: string;
  tagline: string;
  monthly: number; // $/month
  credits: number; // granted each billing cycle
  popular?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "plus",
    name: "Plus",
    tagline: "Best for occasional clipping and posting.",
    monthly: 12,
    credits: 1200,
    features: [
      "1,200 credits / month",
      "YouTube link import",
      "AI video generation (standard models)",
      "Sources up to 1 hour",
      "1080p HD, watermark-free",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Best for creators shipping video every week.",
    monthly: 28,
    credits: 3200,
    popular: true,
    features: [
      "3,200 credits / month",
      "Everything in Plus",
      "Premium video models (Veo, Kling & more)",
      "Sources up to 2 hours",
      "Auto-schedule & direct publishing",
      "Email support",
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    tagline: "Built for professional productions.",
    monthly: 76,
    credits: 10000,
    features: [
      "10,000 credits / month",
      "Everything in Pro",
      "Highest generation priority",
      "Early access to new models",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Best for series, films, and ads — pick your size.",
    monthly: 140, // base (S); scales with STUDIO_SIZES.mult
    credits: 20000, // base (S); scales with STUDIO_SIZES.mult
    features: [
      "20,000+ credits / month — scales with size",
      "Everything in Ultra",
      "Volume pricing from S to MAX",
      "Invoice support",
      "Dedicated support",
    ],
  },
];

// Studio scales via the size selector (credits × price grow together).
export const STUDIO_SIZES = [
  { label: "S", mult: 1 },
  { label: "M", mult: 2 },
  { label: "L", mult: 4 },
  { label: "XL", mult: 8 },
  { label: "MAX", mult: 16 },
];
