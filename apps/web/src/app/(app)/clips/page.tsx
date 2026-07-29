import { Suspense } from "react";
import { ClipsPage } from "@/features/clips";

export default function Page() {
  return (
    <Suspense>
      <ClipsPage />
    </Suspense>
  );
}
