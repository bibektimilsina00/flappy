import { Suspense } from "react";
import { AuthCallbackPage } from "@/features/auth";

export default function Page() {
  return (
    <Suspense>
      <AuthCallbackPage />
    </Suspense>
  );
}
