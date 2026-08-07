"use client";

import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "../components/auth-shell";

export function SignupPage() {
  return (
    <AuthShell>
      <SignUp routing="hash" signInUrl="/login" fallbackRedirectUrl="/dashboard" />
    </AuthShell>
  );
}
