import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  type BlogBlock,
  BRAND,
  Button,
  Container,
  CTA,
  FEATURE_PAGES,
  getFeature,
  Icon,
  Section,
} from "@/features/marketing";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return FEATURE_PAGES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) return { title: "Feature not found" };
  const url = `/features/${feature.slug}`;
  return {
    title: `${feature.title} — Feature`,
    description: feature.tagline,
    keywords: feature.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${feature.title} · ${BRAND.name}`,
      description: feature.tagline,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: `${feature.title} · ${BRAND.name}`,
      description: feature.tagline,
    },
  };
}

function Block({ block }: { block: BlogBlock }) {
  if (block.type === "h2")
    return <h2 className="mt-10 text-xl font-bold tracking-tight text-mk-fg sm:text-2xl">{block.text}</h2>;
  if (block.type === "ul")
    return (
      <ul className="mt-4 space-y-2">
        {block.items.map((item) => (
          <li key={item} className="flex gap-2.5 text-mk-muted">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-mk-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  return <p className="mt-4 leading-relaxed text-mk-muted">{block.text}</p>;
}

export default async function FeaturePageDetail({ params }: Params) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) notFound();

  const related = FEATURE_PAGES.filter((f) => f.slug !== feature.slug).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${feature.title} — ${BRAND.name}`,
    description: feature.tagline,
    url: `https://riocut.com/features/${feature.slug}`,
    isPartOf: { "@type": "WebSite", name: BRAND.name, url: "https://riocut.com" },
    keywords: feature.keywords.join(", "),
  };

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Section className="pb-6 pt-16 sm:pt-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Link
              href="/features"
              className="inline-flex items-center gap-1.5 text-sm text-mk-muted transition-colors hover:text-mk-fg"
            >
              <ArrowLeft className="size-4" /> All features
            </Link>

            <div className="mt-8 grid size-12 place-items-center rounded-xl border border-mk-border bg-mk-bg text-mk-accent">
              <Icon name={feature.icon} className="size-6" />
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-mk-fg sm:text-4xl md:text-5xl text-balance">
              {feature.title}
            </h1>
            <p className="mt-4 text-lg text-mk-muted">{feature.tagline}</p>
          </div>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <div className="mx-auto max-w-3xl">
            <article className="text-[15px] sm:text-base">
              {feature.content.map((block, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static, ordered content blocks
                <Block key={i} block={block} />
              ))}
            </article>

            <div className="mt-12 rounded-2xl border border-mk-accent/30 bg-mk-surface p-6 text-center sm:p-8">
              <h2 className="text-xl font-bold text-mk-fg sm:text-2xl">See it in your workflow</h2>
              <p className="mx-auto mt-2 max-w-md text-mk-muted">
                Prompt, generate, edit, and clip — all on one canvas. Your first video is free.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button href={BRAND.appUrl} size="lg">
                  Start free <ArrowRight className="size-4" />
                </Button>
                <Button href="/pricing" size="lg" variant="secondary">
                  See plans
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* related features */}
      <Section className="pt-0">
        <Container>
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 text-lg font-semibold text-mk-fg">More features</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((f) => (
                <Link
                  key={f.slug}
                  href={`/features/${f.slug}`}
                  className="group rounded-2xl border border-mk-border bg-mk-surface/50 p-6 transition-colors hover:border-mk-borders"
                >
                  <div className="mb-4 grid size-11 place-items-center rounded-xl border border-mk-border bg-mk-bg text-mk-accent">
                    <Icon name={f.icon} className="size-5" />
                  </div>
                  <h3 className="font-semibold text-mk-fg">{f.title}</h3>
                  <p className="mt-2 text-sm text-mk-muted">{f.tagline}</p>
                  <span className="mt-4 flex items-center gap-1.5 text-sm font-medium text-mk-accent">
                    Learn more <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <CTA />
    </>
  );
}
