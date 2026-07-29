import { FeatureTabs } from "@/features/marketing/feature-tabs";
import { Reveal } from "@/features/marketing/reveal";
import {
  ClipsShowcase,
  Compare,
  CTA,
  Faq,
  FeatureRows,
  Features,
  Gallery,
  Hero,
  HowItWorks,
  LogoCloud,
  Models,
  Stats,
  Testimonials,
  UseCases,
} from "@/features/marketing/sections";

export default function MarketingHome() {
  const below = [LogoCloud, ClipsShowcase, FeatureRows, FeatureTabs, Models, HowItWorks, Features, Gallery, Compare, Stats, UseCases, Testimonials, Faq, CTA];
  return (
    <>
      <Hero />
      {below.map((Cmp) => (
        <Reveal key={Cmp.name}>
          <Cmp />
        </Reveal>
      ))}
    </>
  );
}
