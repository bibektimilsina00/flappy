// Single browser-side PostHog initialization point (Next.js framework-native
// entry — runs once before hydration). App code just imports the `posthog`
// singleton; it's already initialized by the time any component mounts.
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

if (key) {
  posthog.init(key, {
    api_host: host, // prod: reverse proxy (t.riocut.com) to dodge ad-blockers
    ui_host: "https://us.posthog.com", // keep toolbar/links pointing at PostHog itself
    person_profiles: "identified_only",
    capture_pageview: false, // handled manually on route change (see posthog-provider)
    capture_pageleave: true,
    capture_exceptions: true, // report uncaught errors to PostHog error tracking
    debug: process.env.NODE_ENV === "development",
  });
} else if (process.env.NODE_ENV === "development") {
  // ponytail: warn, don't throw — analytics is optional locally; a missing key
  // shouldn't break `pnpm dev`. It's a hard-configured build-arg in prod.
  console.warn("[posthog] NEXT_PUBLIC_POSTHOG_KEY is not set — analytics disabled.");
}
