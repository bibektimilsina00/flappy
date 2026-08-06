import {
  FeatureTabs,
  Reveal,
  Compare,
  CTA,
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

// Structured data for rich results — one block, landing page only.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Riocut",
  url: "https://riocut.com",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  description:
    "AI video studio: turn long videos into viral short clips with transcription, " +
    "highlight detection, captions, and one-click social publishing.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
