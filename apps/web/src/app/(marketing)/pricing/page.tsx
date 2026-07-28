import type { Metadata } from "next";
import { FaqList } from "@/features/marketing/faq";
import { MarketingPricing } from "@/features/marketing/pricing-full";
import { CTA } from "@/features/marketing/sections";
import { Container, Section, SectionHeading } from "@/features/marketing/ui";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Plans built for AI creators. Start free, upgrade when you're shipping.",
};

export default function PricingPage() {
  return (
    <>
      <Section className="pb-10 pt-16 sm:pt-20">
        <Container>
          <MarketingPricing />
        </Container>
      </Section>

      <Section className="border-t border-mk-border bg-mk-surface/40 pt-16">
        <Container>
          <SectionHeading eyebrow="Questions" title="Everything you might be wondering." />
          <FaqList />
        </Container>
      </Section>

      <CTA />
    </>
  );
}
