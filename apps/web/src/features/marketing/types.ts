export type NavMenuItem = { icon: string; title: string; desc?: string; href: string };
export type NavFeatured = { title: string; desc?: string; visual: string; href: string; badge?: string };
export type NavItem = { label: string; href?: string; featured?: NavFeatured; menu?: NavMenuItem[] };

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  popular?: boolean;
  features: string[];
}
