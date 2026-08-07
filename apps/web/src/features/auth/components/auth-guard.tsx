"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Client-side guard: redirects to /login when Clerk reports no signed-in session.
// Waits for Clerk to load before deciding so a fresh session isn't bounced.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/login");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) return null;
  return <>{children}</>;
}
