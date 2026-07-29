"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/stores/session";
import { AuthForm } from "../components/auth-form";

export function LoginPage() {
  const token = useSession((s) => s.token);
  const router = useRouter();
  // Wait for the persisted store to hydrate before deciding (mirror of AuthGuard).
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  // Already signed in -> straight to the app instead of showing the form again.
  useEffect(() => {
    if (ready && token) router.replace("/dashboard");
  }, [ready, token, router]);

  if (!ready || token) {
    return <div className="dark min-h-screen bg-background" />;
  }

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <AuthForm />
    </div>
  );
}
