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
  credits: number;
  popular?: boolean;
  features: string[];
}

export interface StudioSize {
  label: string;
  mult: number;
}
