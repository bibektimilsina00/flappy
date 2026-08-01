import { api } from "@/lib/api";

export interface Me {
  id: string;
  email: string;
  name: string;
  auth_provider: string; // password | google | discord
}

export function getMe(): Promise<Me> {
  return api("/users/me");
}

export function updateMe(name: string): Promise<Me> {
  return api("/users/me", { method: "PATCH", body: JSON.stringify({ name }) });
}

export function changePassword(current_password: string, new_password: string): Promise<void> {
  return api("/users/me/password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

export function getSpend(): Promise<{ today: number; week: number; month: number; total: number }> {
  return api("/billing/spend");
}
