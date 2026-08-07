import { useSession } from "@/stores/session";

type ClerkGlobal = { session?: { getToken?: () => Promise<string | null> } };

// The bearer token for API calls. Prefer Clerk's session token (the backend now
// trusts Clerk); fall back to the legacy session store during the migration.
export async function authToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
    try {
      const t = await clerk?.session?.getToken?.();
      if (t) return t;
    } catch {
      // fall through to legacy token
    }
  }
  return useSession.getState().token;
}
