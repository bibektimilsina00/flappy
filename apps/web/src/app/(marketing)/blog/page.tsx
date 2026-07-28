import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BLOG } from "@/features/marketing/content";
import { Poster } from "@/features/marketing/media";
import { CTA } from "@/features/marketing/sections";
import { Container, Section, SectionHeading } from "@/features/marketing/ui";

export const metadata: Metadata = {
  title: "Blog",
  description: "Tutorials, product news, and guides from the Kino team.",
};

export default function BlogPage() {
  const [featured, ...rest] = BLOG;
  return (
    <>
      <Section className="pb-8 pt-16 sm:pt-20">
        <Container>
          <SectionHeading eyebrow="Blog" title="Tutorials, news, and guides." sub="How to get the most out of Kino — plus what we're building next." />
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          {/* featured post */}
          <Link href="#" className="group grid gap-6 rounded-2xl border border-mk-border bg-mk-surface p-4 transition-colors hover:border-mk-borders md:grid-cols-2 md:p-5">
            <Poster tone={featured.tone} label="" ratio="16 / 10" play />
            <div className="flex flex-col justify-center p-2">
              <div className="flex items-center gap-3 text-xs">
                <span className="rounded bg-mk-accent/15 px-2 py-0.5 font-semibold text-mk-accent">{featured.category}</span>
                <span className="text-mk-faint">{featured.date}</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-mk-fg sm:text-3xl">{featured.title}</h2>
              <p className="mt-3 text-mk-muted">{featured.excerpt}</p>
              <span className="mt-5 flex items-center gap-1.5 text-sm font-medium text-mk-accent">
                Read article <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>

          {/* grid */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Link key={post.title} href="#" className="group flex flex-col overflow-hidden rounded-2xl border border-mk-border bg-mk-surface transition-colors hover:border-mk-borders">
                <Poster tone={post.tone} label="" ratio="16 / 9" className="rounded-none border-0 border-b border-mk-border" />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="rounded bg-mk-accent/15 px-2 py-0.5 font-semibold text-mk-accent">{post.category}</span>
                    <span className="text-mk-faint">{post.date}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-mk-fg">{post.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-mk-muted">{post.excerpt}</p>
                  <span className="mt-4 flex items-center gap-1.5 text-sm font-medium text-mk-accent">
                    Read article <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <CTA />
    </>
  );
}
