import type { Metadata } from "next";
import { CTA, Poster, STATS, Container, Section, SectionHeading } from "@/features/marketing";

export const metadata: Metadata = {
  title: "About",
  description: "Why we're building one canvas for AI video.",
};

const VALUES = [
  { title: "One surface, not ten tabs", desc: "Creativity dies in the gaps between tools. We collapse the whole pipeline onto a single canvas." },
  { title: "Models are ingredients", desc: "No model is precious. We give you all of them and get out of the way so the story leads." },
  { title: "Editing should feel like editing", desc: "AI generates the footage; a real, magnetic timeline lets you shape it — no compromises." },
  { title: "Fast beats fussy", desc: "Ship the cut today. Generations stream in the background while you keep working." },
];

export default function AboutPage() {
  return (
    <>
      <Section className="pb-8 pt-16 sm:pt-20">
        <Container>
          <SectionHeading
            eyebrow="About"
            title="We're building the studio that fits in a browser tab."
            sub="Making video used to mean a rack of tools, a render farm, and a lot of waiting. We think a single creator with a good idea should be able to generate, edit, and ship — in one sitting."
          />
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <Poster tone="slate" label="Team photo" ratio="21 / 9" />
        </Container>
      </Section>

      <Section className="border-y border-mk-border bg-mk-surface/30">
        <Container>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold tracking-tight text-mk-accent sm:text-4xl">{s.value}</p>
                <p className="mt-2 text-sm text-mk-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading center={false} eyebrow="What we believe" title="A few principles we build by." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl border border-mk-border bg-mk-surface/50 p-7">
                <h3 className="text-lg font-semibold text-mk-fg">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mk-muted">{v.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <CTA />
    </>
  );
}
