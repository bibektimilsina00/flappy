import { api } from "@/lib/api";

export function getBalance(): Promise<{ balance: number; plan: string }> {
  return api<{ balance: number; plan: string }>("/billing/balance");
}
