"use client";

import { SignIn } from "@clerk/nextjs";

// Clerk-hosted sign-in card. Hash routing keeps it on this single /login route
// (no catch-all segment needed). Already-signed-in users are sent to /dashboard.
export function LoginPage() {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <SignIn routing="hash" signUpUrl="/login" fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
