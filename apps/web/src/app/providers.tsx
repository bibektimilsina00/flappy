"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { PostHogProvider } from "@/shared/providers/posthog-provider";

// App-wide client providers. Add new global providers (theme, analytics, etc.) here.
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <PostHogProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </PostHogProvider>
  );
}
