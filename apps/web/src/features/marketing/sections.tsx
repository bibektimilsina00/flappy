import { ArrowRight, Check, Play, Scissors, Star, X } from "lucide-react";
import type { ReactNode } from "react";
import { COMPARE, FEATURE_ROWS, FEATURES, HERO, LOGOS, MODELS, STATS, STEPS, TESTIMONIALS, USE_CASES } from "./content";
import { cn } from "@/lib/cn";
import { FaqList } from "./faq";
import { Icon } from "./icon";
import { Poster, toneAt, unsplash } from "./media";
import { Visual } from "./menu-visuals";
import { PricingCards } from "./pricing-cards";
import { ProductMock } from "./product-mock";
import { Button, Card, Container, Section, SectionHeading } from "./ui";

function Accented({ text, accent }: { text: string; accent?: string }): ReactNode {
  if (!accent) return text;
  const i = text.indexOf(accent);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-mk-accent">{accent}</span>
      {text.slice(i + accent.length)}
    </>
  );
}

export function Hero() {
  return (
    <Section className="pt-16 sm:pt-24">
      <Container>
        <div className="flex flex-col items-center text-center">
          <h1 className="mk-in max-w-4xl text-balance text-5xl font-bold leading-[1.02] tracking-tight text-mk-fg sm:text-7xl md:text-[5rem]">
            <Accented text={HERO.title} accent={HERO.accent} />
          </h1>
          <p className="mk-in mt-6 max-w-xl text-pretty text-base leading-relaxed text-mk-muted sm:text-lg" style={{ animationDelay: "160ms" }}>
            {HERO.subtitle}
          </p>
          <div className="mk-in mt-8 flex flex-col items-center gap-3 sm:flex-row" style={{ animationDelay: "230ms" }}>
            <Button href={HERO.primary.href} size="lg">
              {HERO.primary.label}
            </Button>
            <Button href={HERO.secondary.href} size="lg" variant="secondary">
              <Play className="size-4" /> {HERO.secondary.label}
            </Button>
          </div>
          <p className="mk-in mt-4 text-xs text-mk-faint" style={{ animationDelay: "290ms" }}>
            {HERO.note}
          </p>
        </div>

        <div className="mk-in relative mx-auto mt-16 max-w-6xl" style={{ animationDelay: "360ms" }}>
          {/* generated-clip thumbnails peeking from behind, gently floating (wide screens) */}
          <Poster src={unsplash("1470225620780-dba8ba36b745", 400)} ratio="9 / 16" style={{ "--mk-r": "-8deg" } as React.CSSProperties} className="mk-float pointer-events-none absolute -left-20 top-4 hidden w-24 shadow-2xl 2xl:block" />
          <Poster src={unsplash("1492691527719-9d1e07e534b4", 400)} ratio="9 / 16" style={{ "--mk-r": "8deg", animationDelay: "1.2s" } as React.CSSProperties} className="mk-float pointer-events-none absolute -right-20 top-10 hidden w-24 shadow-2xl 2xl:block" />
          <ProductMock className="relative z-10 shadow-2xl shadow-black/40" />
        </div>
      </Container>
    </Section>
  );
}

// Alternating detailed product rows — the substance of the page.
export function FeatureRows() {
  return (
    <Section id="product">
      <Container>
        <div className="flex flex-col gap-24 lg:gap-32">
          {FEATURE_ROWS.map((row) => (
            <div key={row.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={row.reverse ? "lg:order-2" : undefined}>
                <p className="text-sm font-semibold text-mk-accent">{row.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-mk-fg sm:text-3xl md:text-4xl">{row.title}</h3>
                <p className="mt-4 text-mk-muted sm:text-lg">{row.desc}</p>
                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {row.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-mk-fg/90">
                      <Check className="size-4 shrink-0 text-mk-accent" /> {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  <Button href="/features" variant="secondary">
                    Learn more <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
              <div className={row.reverse ? "lg:order-1" : undefined}>
                {row.media === "mock" ? <ProductMock /> : <Poster src={unsplash(row.media.img, 900)} label={row.media.label} play={row.media.play} ratio="16 / 10" />}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function Models() {
  return (
    <Section className="overflow-hidden border-y border-mk-border bg-mk-surface/40">
      <Container>
        <SectionHeading eyebrow="Powered by the best" title="Every leading model, one login." sub="Pick the model that fits the shot — free-tier options are included, premium models unlock on Pro. New models arrive without you lifting a finger." />
      </Container>
      <div className="mt-12 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
        <div className="mk-marquee flex w-max gap-3 hover:[animation-play-state:paused]">
          {[...MODELS, ...MODELS].map((m, i) => (
            <span key={`${m}-${i}`} className="shrink-0 rounded-lg border border-mk-border bg-mk-bg px-5 py-2.5 text-sm font-medium text-mk-fg/90">
              {m}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function Compare() {
  return (
    <Section id="why">
      <Container>
        <SectionHeading eyebrow="Why switch" title="A whole workflow, minus the friction." />
        <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-mk-border bg-mk-surface p-7">
            <h3 className="text-lg font-semibold text-mk-muted">{COMPARE.old.title}</h3>
            <ul className="mt-5 flex flex-col gap-3.5">
              {COMPARE.old.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-mk-muted">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mk-surface2 text-mk-faint">
                    <X className="size-3" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-mk-accent/40 bg-mk-surface p-7">
            <h3 className="text-lg font-semibold text-mk-fg">{COMPARE.now.title}</h3>
            <ul className="mt-5 flex flex-col gap-3.5">
              {COMPARE.now.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-mk-fg/90">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mk-accent/15 text-mk-accent">
                    <Check className="size-3" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function LogoCloud() {
  return (
    <Container className="pb-4">
      <p className="text-center text-xs uppercase tracking-widest text-mk-faint">Trusted by teams shipping video every day</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {LOGOS.map((name) => (
          <span key={name} className="text-lg font-semibold tracking-tight text-mk-muted/70">
            {name}
          </span>
        ))}
      </div>
    </Container>
  );
}

export function Features() {
  return (
    <Section id="features">
      <Container>
        <SectionHeading
          eyebrow="Why Riocut"
          title="One workspace for the whole pipeline."
          sub="Generation and editing usually live in different tools. Riocut puts them on the same canvas — nothing gets exported, re-imported, or lost in between."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-4">
              <Visual name={f.visual} className="h-32" />
              <div className="mt-4 flex items-center gap-2.5 px-1">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-mk-accent/10 text-mk-accent">
                  <Icon name={f.icon} className="size-4" />
                </span>
                <h3 className="text-[15px] font-semibold text-mk-fg">{f.title}</h3>
              </div>
              <p className="mt-2 px-1 text-sm leading-relaxed text-mk-muted">{f.desc}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function HowItWorks() {
  return (
    <Section id="how" className="border-y border-mk-border bg-mk-surface/40">
      <Container>
        <SectionHeading eyebrow="How it works" title="From a single prompt to a finished cut." />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-mk-border bg-mk-bg p-6">
              <span className="text-sm font-bold text-mk-accent tabular-nums">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-mk-fg">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mk-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

const GALLERY = [
  { label: "Product ad", views: "873K", img: "1523275335684-37898b6baf30" },
  { label: "Music video", views: "934K", img: "1493225457124-a3eb161ffa5f" },
  { label: "Explainer", views: "293K", img: "1531482615713-2afd69097998" },
  { label: "Short film", views: "129K", img: "1485846234645-a62644f84728" },
  { label: "Social clip", views: "243K", img: "1611262588024-d12430b98920" },
  { label: "Fashion promo", views: "512K", img: "1483985988355-763728e1935b" },
  { label: "Travel reel", views: "418K", img: "1476514525535-07fb3b4ae5f1" },
  { label: "Recap", views: "187K", img: "1495020689067-958852a7765e" },
  { label: "Trailer", views: "356K", img: "1489599849927-2ee91cede3ba" },
  { label: "Tutorial", views: "204K", img: "1501504905252-473c47e087f8" },
];

export function Gallery() {
  return (
    <Section id="showcase">
      <Container>
        <SectionHeading
          eyebrow="Made with Riocut"
          title="Templates for everything."
          sub="From AI-generated scenes to timeless classics, find a one-click start for any video. Drop your own examples in here."
          action={<Button href="/login">Try online</Button>}
        />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {GALLERY.map((g, i) => (
            <Poster
              key={g.label}
              tone={toneAt(i)}
              src={unsplash(g.img, 600)}
              ratio="3 / 4"
              play
              label={g.label}
              badge={
                <>
                  <Scissors className="size-3" /> {g.views}
                </>
              }
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function Stats() {
  return (
    <Section className="py-16">
      <Container>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-bold tracking-tight text-mk-fg sm:text-5xl">{s.value}</p>
              <p className="mt-2 text-sm text-mk-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function UseCases() {
  return (
    <Section id="use-cases">
      <Container>
        <SectionHeading eyebrow="Use cases" title="Made for whatever you're shipping." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((u, i) => (
            <div key={u.title} className="group overflow-hidden rounded-2xl border border-mk-border bg-mk-surface transition-colors hover:border-mk-borders">
              <Poster src={unsplash(u.img, 800)} ratio="16 / 9" play className="rounded-none border-0 border-b border-mk-border" />
              <div className="flex items-start gap-3 p-5">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-mk-accent/10 text-mk-accent">
                  <Icon name={u.icon} className="size-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-mk-fg">{u.title}</h3>
                  <p className="mt-1 text-sm text-mk-muted">{u.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function Testimonials() {
  return (
    <Section id="testimonials" className="border-y border-mk-border bg-mk-surface/40">
      <Container>
        <SectionHeading
          center={false}
          eyebrow="Voice of our users"
          title="Loved by creators worldwide."
          sub="Riocut helps creators produce amazing content quickly — here's what a few of them say."
          action={<Button href="/login">Try online</Button>}
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex h-full flex-col justify-between rounded-2xl border border-mk-border bg-mk-bg p-6">
              <div>
                <div className="mb-3 flex gap-0.5 text-mk-accent">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="size-3.5 fill-current" />
                  ))}
                </div>
                <blockquote className="text-[15px] leading-relaxed text-mk-fg/90">“{t.quote}”</blockquote>
              </div>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-mk-accent/15 text-xs font-semibold text-mk-accent">
                  {t.name.split(" ").map((w) => w[0]).join("")}
                </span>
                <span className="text-sm">
                  <span className="block font-medium text-mk-fg">{t.name}</span>
                  <span className="block text-mk-muted">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function Pricing() {
  return (
    <Section id="pricing">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Start free. Upgrade when you're shipping."
          sub="Free credits every month, no card required. Move to Pro for premium models and 4K exports."
        />
        <div className="mt-12">
          <PricingCards />
        </div>
      </Container>
    </Section>
  );
}

export function Faq() {
  return (
    <Section id="faq">
      <Container>
        <SectionHeading eyebrow="Questions" title="Everything you might be wondering." />
        <FaqList />
      </Container>
    </Section>
  );
}

export function CTA() {
  return (
    <Section>
      <Container>
        <div className="flex flex-col items-center rounded-3xl border border-mk-border bg-mk-surface px-6 py-16 text-center sm:px-16">
          <h2 className="max-w-2xl text-balance text-3xl font-bold tracking-tight text-mk-fg sm:text-5xl">Your next video starts with a sentence.</h2>
          <p className="mt-4 max-w-xl text-mk-muted">Spin up a project, type a prompt, and watch it come together. Free credits every month.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href={HERO.primary.href} size="lg">
              {HERO.primary.label} <ArrowRight className="size-4" />
            </Button>
            <Button href="/pricing" size="lg" variant="secondary">
              See pricing
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-mk-muted">
            {["No credit card", "Cancel anytime", "Export in minutes"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-mk-accent" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}

// ── AI Clips showcase: the repurposing pipeline, illustrated ──
export function ClipsShowcase() {
  const cards = [
    { img: "1571019613454-1cb2f99b2d8b", score: 92, caption: ["the", "wild", "part", "is…"], r: "-7deg", lift: "" },
    { img: "1504674900247-0877df9cc836", score: 88, caption: ["nobody", "talks", "about"], r: "0deg", lift: "-translate-y-4" },
    { img: "1611162617213-7d7a39e9b1d7", score: 81, caption: ["here's", "the", "secret"], r: "7deg", lift: "" },
  ];
  return (
    <Section id="clips" className="border-y border-mk-border bg-mk-surface/40">
      <Container>
        <SectionHeading
          eyebrow="AI Clips"
          title="Turn one long video into a week of content."
          sub="Paste a link. Riocut transcribes every word, scores the strongest moments, and hands back captioned vertical clips — scheduled and ready to post."
        />
        <div>
          <div className="mt-14 grid items-center gap-10 md:grid-cols-[1fr_auto_1.2fr]">
            {/* source */}
            <div className="mx-auto w-full max-w-[340px]">
              <div className="relative overflow-hidden rounded-2xl border border-mk-border shadow-2xl" style={{ aspectRatio: "16 / 9" }}>
                <Poster src={unsplash("1478737270239-2f02b77fc618", 700)} ratio="16 / 9" className="absolute inset-0 w-full" />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid size-12 place-items-center rounded-full bg-white/10 backdrop-blur">
                    <Play className="ml-0.5 size-5 fill-white text-white" />
                  </span>
                </div>
                <div className="absolute inset-x-4 bottom-3 h-1 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-1/3 rounded-full bg-mk-accent" />
                </div>
              </div>
              <p className="mt-3 text-center text-sm text-mk-muted">Your 25-minute episode</p>
            </div>

            {/* arrow */}
            <div className="mx-auto flex flex-col items-center gap-1 text-mk-accent">
              <ArrowRight className="hidden size-6 md:block" />
              <p className="w-28 text-center text-xs leading-tight text-mk-muted">AI finds the moments</p>
            </div>

            {/* clip fan */}
            <div className="flex items-end justify-center gap-4">
              {cards.map((c, i) => (
                <div
                  key={c.score}
                  className={cn("mk-float relative h-56 w-32 overflow-hidden rounded-2xl border border-mk-border shadow-2xl", c.lift)}
                  style={{ "--mk-r": c.r, animationDelay: `${i * 0.6}s` } as React.CSSProperties}
                >
                  <Poster src={unsplash(c.img, 400)} ratio="9 / 16" className="absolute inset-0 w-full" />
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                    🔥 {c.score}
                  </span>
                  <span className="absolute inset-x-2 bottom-3 rounded-lg bg-black/60 px-2 py-1.5 text-center text-[10px] font-semibold leading-tight text-white">
                    {c.caption.map((w, j) => (
                      <span key={w} className={j === 1 ? "text-mk-accent" : ""}>
                        {w}{" "}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {["AI moment selection", "Word-by-word captions", "Vertical reframing", "Virality scores", "Auto-schedule"].map((f) => (
              <span key={f} className="flex items-center gap-2 text-sm text-mk-muted">
                <Check className="size-4 text-mk-accent" /> {f}
              </span>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button href="/login" size="lg">
              Clip your first video free
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
