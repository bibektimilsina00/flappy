import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import { FEATURES, MODES } from "@/features/marketing/content";
import { Icon } from "@/features/marketing/icon";
import { Poster } from "@/features/marketing/media";
import { ProductMock } from "@/features/marketing/product-mock";
import { CTA } from "@/features/marketing/sections";
import { Button, Container, Section, SectionHeading } from "@/features/marketing/ui";

export const metadata: Metadata = {
  title: "Features",
  description: "The node canvas, the magnetic timeline, and every AI model in one place.",
};

function Split({
  eyebrow,
  title,
  sub,
  bullets,
  media,
  reverse,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  bullets: string[];
  media: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <div className={reverse ? "lg:order-2" : undefined}>
        <SectionHeading center={false} eyebrow={eyebrow} title={title} sub={sub} />
        <ul className="mt-6 flex flex-col gap-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-mk-accent" />
              <span className="text-mk-fg/90">{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={reverse ? "lg:order-1" : undefined}>{media}</div>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <>
      <Section className="pb-6 pt-16 sm:pt-20">
        <Container>
          <SectionHeading
            eyebrow="Features"
            title="A generation studio and an editor, fused."
            sub="Everything you need to take an idea to a finished video, without switching apps or exporting between steps."
          />
        </Container>
      </Section>

      <Section className="pt-4">
        <Container className="flex flex-col gap-24">
          <Split
            eyebrow="Node canvas"
            title="Build your pipeline visually."
            sub="Each node is a model call. Wire a prompt into an image, an image into a video, then extend the video — the graph is your storyboard and your render pipeline at once."
            bullets={[
              "Chain text, image, and video models freely",
              "Reference images flow downstream automatically",
              "Swap models from a single menu, any time",
              "Generations run in the cloud and stream back",
            ]}
            media={<ProductMock />}
          />
          <Split
            reverse
            eyebrow="Magnetic timeline"
            title="Cut like a pro, effortlessly."
            sub="A Final-Cut-style timeline that keeps itself tidy. Insert makes room, delete closes the gap, trims ripple — all frame-perfect, all on the same canvas as your models."
            bullets={[
              "Gap-free magnetic editing",
              "Frame-accurate trims and splits",
              "Connected captions, audio, and overlays",
              "Instant preview and clean MP4 export",
            ]}
            media={<Poster tone="slate" label="Timeline editor" ratio="16 / 10" play />}
          />
        </Container>
      </Section>

      <Section className="border-y border-mk-border bg-mk-surface/30">
        <Container>
          <SectionHeading eyebrow="Every mode" title="Four ways to make a shot." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODES.map((m) => (
              <div key={m.title} className="rounded-2xl border border-mk-border bg-mk-bg/40 p-6">
                <span className="rounded-md bg-mk-accent/15 px-2 py-0.5 text-xs font-semibold text-mk-accent">{m.tag}</span>
                <h3 className="mt-4 font-semibold text-mk-fg">{m.title}</h3>
                <p className="mt-1 text-sm text-mk-muted">{m.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading eyebrow="And more" title="Details that add up." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-mk-border bg-mk-surface/50 p-6">
                <div className="mb-4 grid size-11 place-items-center rounded-xl border border-mk-border bg-mk-bg text-mk-accent">
                  <Icon name={f.icon} className="size-5" />
                </div>
                <h3 className="font-semibold text-mk-fg">{f.title}</h3>
                <p className="mt-2 text-sm text-mk-muted">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <Button href="/pricing" size="lg">
              See plans <ArrowRight className="size-4" />
            </Button>
          </div>
        </Container>
      </Section>

      <CTA />
    </>
  );
}
