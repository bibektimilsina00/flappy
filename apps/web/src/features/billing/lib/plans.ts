import type { Plan, StudioSize } from "../types";

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
    monthly: 140,
    credits: 20000,
    features: [
      "20,000+ credits / month — scales with size",
      "Everything in Ultra",
      "Volume pricing from S to MAX",
      "Invoice support",
      "Dedicated support",
    ],
  },
];

export const STUDIO_SIZES: StudioSize[] = [
  { label: "S", mult: 1 },
  { label: "M", mult: 2 },
  { label: "L", mult: 4 },
  { label: "XL", mult: 8 },
  { label: "MAX", mult: 16 },
];
