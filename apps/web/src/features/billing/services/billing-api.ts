import { api } from "@/lib/api";

export function getBalance(): Promise<{ balance: number; plan: string }> {
  return api<{ balance: number; plan: string }>("/billing/balance");
}

export function startUpgrade(): Promise<{ checkout_url: string }> {
  return api<{ checkout_url: string }>("/billing/upgrade", { method: "POST" });
}
