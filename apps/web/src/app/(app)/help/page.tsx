import { BookOpen, ChevronDown, Clapperboard, Component, LifeBuoy, Mail, Scissors, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { BRAND, FAQ } from "@/features/marketing/lib/content";

const GUIDES = [
  { icon: Scissors, title: "AI Clips", desc: "Turn a long video into captioned vertical clips.", href: "/clips" },
  { icon: Component, title: "Node Canvas", desc: "Generate footage by chaining AI models.", href: "/canvas" },
  { icon: Clapperboard, title: "Timeline Editor", desc: "Cut and arrange on a magnetic timeline.", href: "/video-editor" },
  { icon: Send, title: "Publishing", desc: "Schedule and post finished clips to your socials.", href: "/clips" },
];

export default function HelpPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
        {/* header */}
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-400/10 text-teal-300">
            <LifeBuoy className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Help &amp; support</h1>
            <p className="mt-1 text-sm text-muted-foreground">Guides, answers, and a way to reach the team.</p>
          </div>
        </div>

        {/* get started */}
        <h2 className="mt-8 mb-3 text-sm font-semibold text-muted-foreground">Get started</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GUIDES.map(({ icon: Icon, title, desc, href }) => (
            <Link
              key={title}
              href={href}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-teal-400/40"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-teal-300">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* FAQ */}
        <h2 className="mt-10 mb-3 text-sm font-semibold text-muted-foreground">Frequently asked questions</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {FAQ.map((f) => (
            <details key={f.q} className="group border-b border-border last:border-b-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>

        {/* still need help */}
        <h2 className="mt-10 mb-3 text-sm font-semibold text-muted-foreground">Still need help?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={`mailto:${BRAND.email}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-teal-400/40"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-teal-300">
              <Mail className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Email support</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{BRAND.email}</p>
            </div>
          </a>
          <Link
            href="/blog"
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-teal-400/40"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-teal-300">
              <BookOpen className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Guides &amp; tutorials</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Read the blog</p>
            </div>
          </Link>
        </div>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-teal-300" /> New to {BRAND.name}? Start with AI Clips — paste a link and go.
        </p>
      </div>
    </div>
  );
}
