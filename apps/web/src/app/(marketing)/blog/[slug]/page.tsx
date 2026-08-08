import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BLOG,
  type BlogBlock,
  BRAND,
  Container,
  CTA,
  getPost,
  media,
  Poster,
  Section,
} from "@/features/marketing";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article not found" };
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url,
      publishedTime: post.iso,
      authors: [post.author],
      images: post.img ? [{ url: post.img }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.img ? [post.img] : undefined,
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

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = BLOG.filter((p) => p.slug !== post.slug).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    ...(post.img ? { image: post.img } : {}),
    datePublished: post.iso,
    dateModified: post.iso,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      logo: { "@type": "ImageObject", url: "https://riocut.com/logo.svg" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://riocut.com/blog/${post.slug}` },
    keywords: post.keywords.join(", "),
  };

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Section className="pb-6 pt-16 sm:pt-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-mk-muted transition-colors hover:text-mk-fg"
            >
              <ArrowLeft className="size-4" /> All articles
            </Link>

            <div className="mt-6 flex items-center gap-3 text-xs">
              <span className="rounded bg-mk-accent/15 px-2 py-0.5 font-semibold text-mk-accent">{post.category}</span>
              <time dateTime={post.iso} className="text-mk-faint">
                {post.date}
              </time>
              <span className="text-mk-faint">·</span>
              <span className="text-mk-faint">{post.readMins} min read</span>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-mk-fg sm:text-4xl md:text-5xl text-balance">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-mk-muted">{post.excerpt}</p>
            <p className="mt-5 text-sm text-mk-faint">By {post.author}</p>
          </div>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Poster
              tone={post.tone}
              src={post.img ? media(post.img, 1200) : undefined}
              alt={post.title}
              ratio="16 / 9"
              className="mb-10"
            />
            <article className="text-[15px] sm:text-base">
              {post.content.map((block, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static, ordered article blocks
                <Block key={i} block={block} />
              ))}
            </article>

            <div className="mt-12 rounded-2xl border border-mk-accent/30 bg-mk-surface p-6 text-center sm:p-8">
              <h2 className="text-xl font-bold text-mk-fg sm:text-2xl">Try it on your next video</h2>
              <p className="mx-auto mt-2 max-w-md text-mk-muted">
                Prompt, generate, edit, and clip — all on one canvas. Your first video is free.
              </p>
              <Link
                href={BRAND.appUrl}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-mk-accent px-5 py-2.5 text-sm font-semibold text-mk-accentfg transition-opacity hover:opacity-90"
              >
                Start free <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* related */}
      <Section className="pt-0">
        <Container>
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 text-lg font-semibold text-mk-fg">Keep reading</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-mk-border bg-mk-surface transition-colors hover:border-mk-borders"
                >
                  <Poster
                    tone={p.tone}
                    src={p.img ? media(p.img, 600) : undefined}
                    alt={p.title}
                    ratio="16 / 9"
                    className="rounded-none border-0 border-b border-mk-border"
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="rounded bg-mk-accent/15 px-2 py-0.5 font-semibold text-mk-accent">{p.category}</span>
                      <span className="text-mk-faint">{p.date}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-mk-fg">{p.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-mk-muted">{p.excerpt}</p>
                    <span className="mt-4 flex items-center gap-1.5 text-sm font-medium text-mk-accent">
                      Read article <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
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
