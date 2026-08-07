"use client";

import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "../components/auth-shell";

export function LoginPage() {
  return (
    <AuthShell>
      <SignIn routing="hash" signUpUrl="/signup" fallbackRedirectUrl="/dashboard" />
    </AuthShell>
  );
}
