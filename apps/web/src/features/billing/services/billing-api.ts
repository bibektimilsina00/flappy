import { api } from "@/lib/api";
import type { BalanceResponse, CheckoutResponse } from "../types";

export function getBalance(): Promise<BalanceResponse> {
  return api<BalanceResponse>("/billing/balance");
}

export function startUpgrade(tier: string): Promise<CheckoutResponse> {
  return api<CheckoutResponse>("/billing/upgrade", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
}
