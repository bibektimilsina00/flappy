import type { Metadata } from "next";
import {
  FeatureTabs,
  Reveal,
  Compare,
  CTA,
  FAQ,
  Faq,
  Features,
  FeatureRows,
  Hero,
  LogoCloud,
  Models,
  Stats,
  HowItWorks,
  Testimonials,
  UseCases,
  ClipsShowcase,
  Gallery,
} from "@/features/marketing";

export const metadata: Metadata = {
  title: "Riocut — AI video studio: clips, generation & editing in one place",
  description:
    "Turn long videos into captioned vertical clips, generate footage from text and images, and edit on a magnetic timeline — all in one AI video studio.",
  keywords: [
    "ai video studio",
    "ai clips",
    "video repurposing",
    "youtube to shorts",
    "text to video",
    "image to video",
    "ai video editor",
    "auto captions",
    "social video scheduler",
  ],
  alternates: { canonical: "/" },
};

// Structured data for rich results (Organization, WebSite, SoftwareApplication,
// and the FAQ) — landing page only.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://riocut.com/#org",
      name: "Riocut",
      url: "https://riocut.com",
      logo: "https://riocut.com/logo.svg",
      description: "All-in-one AI video studio for generating, editing, and clipping video.",
    },
    {
      "@type": "WebSite",
      "@id": "https://riocut.com/#website",
      name: "Riocut",
      url: "https://riocut.com",
      publisher: { "@id": "https://riocut.com/#org" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Riocut",
      url: "https://riocut.com",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      description:
        "AI video studio: turn long videos into viral short clips with transcription, highlight detection, captions, and one-click social publishing — plus a node canvas for AI generation and a magnetic timeline editor.",
      featureList: [
        "AI Clips — long video to captioned vertical shorts",
        "Node canvas for chaining AI generation models",
        "Magnetic timeline video editor",
        "Text-to-image, text-to-video, image-to-video and video-extend models",
        "Auto-schedule and publish to TikTok, YouTube Shorts and Instagram Reels",
      ],
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: "0",
        highPrice: "140",
        offerCount: "5",
      },
      screenshot: "https://riocut.com/og.png",
      publisher: { "@id": "https://riocut.com/#org" },
    },
    {
      "@type": "FAQPage",
      "@id": "https://riocut.com/#faq",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function MarketingHome() {
  const below = [LogoCloud, ClipsShowcase, FeatureRows, FeatureTabs, Models, HowItWorks, Features, Gallery, Compare, Stats, UseCases, Testimonials, Faq, CTA];
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Hero />
      {below.map((Cmp) => (
        <Reveal key={Cmp.name}>
          <Cmp />
        </Reveal>
      ))}
    </>
  );
}
