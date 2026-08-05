"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/stores/session";
import { getCurrentUser } from "../services/auth-api";

// Landing point after an OAuth redirect: ?token=<jwt>. Store it, load the user,
// then continue to the app.
export function AuthCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    useSession.getState().setToken(token);
    getCurrentUser()
      .then((user) => {
        useSession.getState().setAuth({ token, user });
        router.replace("/dashboard");
      })
      .catch(() => {
        useSession.getState().clear();
        router.replace("/login");
      });
  }, [params, router]);

  return (
    <div className="dark grid min-h-screen place-items-center bg-background text-foreground">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
