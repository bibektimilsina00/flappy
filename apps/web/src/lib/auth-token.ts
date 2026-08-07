type ClerkGlobal = { session?: { getToken?: () => Promise<string | null> } };

// The bearer token for API calls — Clerk's session token. Null when signed out
// (or before Clerk has loaded), which callers treat as unauthenticated.
export async function authToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
  try {
    return (await clerk?.session?.getToken?.()) ?? null;
  } catch {
    return null;
  }
}
