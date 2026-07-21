"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/stores/session";

// Client-side guard: redirects to /login when there's no token. Waits for
// mount so the persisted session has rehydrated before deciding.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useSession((s) => s.token);
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (ready && !token) router.replace("/login");
  }, [ready, token, router]);

  if (!ready || !token) return null;
  return <>{children}</>;
}
