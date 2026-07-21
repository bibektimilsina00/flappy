import { api } from "@/lib/api";
import type { SessionUser } from "@/stores/session";

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: SessionUser;
}

export function register(data: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) });
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getProviders(): Promise<Record<string, boolean>> {
  return api<Record<string, boolean>>("/auth/providers");
}

export function oauthLoginUrl(provider: string): string {
  return `${API_BASE}/api/v1/auth/oauth/${provider}/login`;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  // The login endpoint expects OAuth2 form encoding, not JSON.
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(detail?.detail ?? "Login failed");
  }
  return res.json() as Promise<AuthResponse>;
}
