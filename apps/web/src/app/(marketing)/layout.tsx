import type { Metadata } from "next";
import { MarketingFooter } from "@/features/marketing/footer";
import { MarketingNav } from "@/features/marketing/nav";
import { BRAND } from "@/features/marketing/content";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.tagline,
};

// Public marketing pages. Self-contained dark palette (mk-* tokens) — independent of
// the app's theme, and outside the AuthGuard that wraps the (app) group.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-mk-bg text-mk-fg antialiased">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
