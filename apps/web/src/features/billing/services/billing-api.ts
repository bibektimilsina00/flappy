import { api } from "@/lib/api";

export function getBalance(): Promise<{ balance: number; plan: string }> {
  return api<{ balance: number; plan: string }>("/billing/balance");
}

// tier: plus | pro | ultra | studio_s … studio_max (validated server-side)
export function startUpgrade(tier: string): Promise<{ checkout_url: string }> {
  return api<{ checkout_url: string }>("/billing/upgrade", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
}
