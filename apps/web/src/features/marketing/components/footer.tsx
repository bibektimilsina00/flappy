import { AtSign, MessageCircle, Play } from "lucide-react";
import Link from "next/link";
import { BRAND, FOOTER } from "../lib/content";
import { Container } from "./ui";
import { Wordmark } from "./wordmark";
import { NewsletterForm } from "./newsletter-form";

export function MarketingFooter() {
  return (
    <footer className="border-t border-mk-border bg-mk-surface/40">
      <Container className="py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-[repeat(5,1fr)_1.3fr]">
          {FOOTER.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-mk-fg">{col.title}</p>
              {col.links.map((l) => (
                <Link key={l.label} href={l.href} className="text-sm text-mk-muted transition-colors hover:text-mk-fg">
                  {l.label}
                </Link>
              ))}
            </div>
          ))}

          {/* brand block */}
          <div className="flex flex-col items-start gap-4">
            <Wordmark />
            <p className="text-sm text-mk-muted">{BRAND.tagline}</p>
            <div className="w-full pt-1">
              <NewsletterForm />
            </div>
            <div className="flex items-center gap-2 pt-1">
              {[
                { Icon: AtSign, href: BRAND.social.x, label: "X" },
                { Icon: Play, href: BRAND.social.youtube, label: "YouTube" },
                { Icon: MessageCircle, href: BRAND.social.discord, label: "Discord" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-lg border border-mk-border text-mk-muted transition-colors hover:border-mk-borders hover:text-mk-fg"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-mk-border pt-6 text-sm text-mk-faint sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <p>Built for creators. Media shown is placeholder.</p>
        </div>
      </Container>
    </footer>
  );
}
