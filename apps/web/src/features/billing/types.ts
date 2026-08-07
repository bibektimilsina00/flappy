export interface BalanceResponse {
  balance: number;
  plan: string;
}

export interface CheckoutResponse {
  checkout_url: string;
}

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  // Yearly total (billed once/year). 2 months free → monthly * 10.
  yearly: number;
  credits: number;
  popular?: boolean;
  features: string[];
}

export type BillingPeriod = "monthly" | "yearly";

export interface StudioSize {
  label: string;
  mult: number;
}
