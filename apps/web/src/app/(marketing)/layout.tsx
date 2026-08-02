import type { Metadata } from "next";
import { MarketingFooter } from "@/features/marketing/footer";
import { MarketingNav } from "@/features/marketing/nav";
import { BRAND } from "@/features/marketing/content";

const DESCRIPTION =
  "Riocut turns long videos into viral short clips and finished videos with AI — " +
  "transcription, highlight detection, captions, and one-click " +
  "publishing to YouTube, TikTok, Instagram, X, LinkedIn, and Facebook.";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: DESCRIPTION,
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: DESCRIPTION,
    url: "./",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${BRAND.name} — AI video studio` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
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
