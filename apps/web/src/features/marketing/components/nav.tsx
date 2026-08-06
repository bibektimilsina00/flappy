"use client";

import { ArrowRight, ChevronDown, Globe, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { BRAND, NAV, type NavItem, type NavMenuItem } from "../lib/content";
import { Icon } from "./icon";
import { MenuVisual } from "./menu-visuals";
import { Button } from "./ui";
import { Wordmark } from "./wordmark";

/** A compact bordered card: icon + title + subtitle (the small cells in the bento). */
function MenuCard({ m }: { m: NavMenuItem }) {
  return (
    <Link href={m.href} className="group/i rounded-xl border border-mk-border bg-mk-bg p-3 transition-colors hover:border-mk-borders hover:bg-mk-surface2">
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-mk-accent/10 text-mk-accent transition-colors group-hover/i:bg-mk-accent group-hover/i:text-mk-accentfg">
          <Icon name={m.icon} className="size-4" />
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-mk-fg">
          {m.title}
          <ArrowRight className="size-3 -translate-x-1 text-mk-accent opacity-0 transition-all group-hover/i:translate-x-0 group-hover/i:opacity-100" />
        </span>
      </div>
      {m.desc ? <p className="mt-1.5 text-xs leading-snug text-mk-muted">{m.desc}</p> : null}
    </Link>
  );
}

function DesktopItem({ item }: { item: NavItem }) {
  if (!item.menu) {
    return (
      <Link href={item.href ?? "#"} className="rounded-lg px-3 py-2 text-sm font-medium text-mk-muted transition-colors hover:text-mk-fg">
        {item.label}
      </Link>
    );
  }
  const featured = item.featured;
  const width = featured ? "w-[min(94vw,720px)]" : item.menu.length <= 2 ? "w-[min(92vw,300px)]" : "w-[min(92vw,460px)]";

  return (
    <div className="group relative">
      <button type="button" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-mk-muted transition-colors group-hover:text-mk-fg">
        {item.label}
        <ChevronDown className="size-3.5 opacity-60 transition-transform duration-200 group-hover:rotate-180" />
      </button>
      <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className={cn("rounded-2xl border border-mk-border bg-mk-surface p-2.5 shadow-2xl shadow-black/60", width)}>
          <div className={cn("grid gap-2.5", featured && "grid-cols-[1.15fr_1fr]")}>
            {featured ? (
              <Link href={featured.href} className="group/f flex flex-col overflow-hidden rounded-xl border border-mk-border bg-mk-bg p-2.5 transition-colors hover:border-mk-borders">
                <MenuVisual name={featured.visual} />
                <div className="px-1.5 pb-1 pt-3">
                  {featured.badge ? (
                    <span className="mb-1.5 inline-block rounded bg-mk-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mk-accent">{featured.badge}</span>
                  ) : null}
                  <div className="flex items-center gap-1 text-sm font-semibold text-mk-fg">
                    {featured.title}
                    <ArrowRight className="size-3.5 -translate-x-1 text-mk-accent opacity-0 transition-all group-hover/f:translate-x-0 group-hover/f:opacity-100" />
                  </div>
                  {featured.desc ? <p className="mt-1 text-xs leading-snug text-mk-muted">{featured.desc}</p> : null}
                </div>
              </Link>
            ) : null}

            <div className={cn("grid gap-2.5 content-start", featured ? "grid-cols-2" : item.menu.length <= 2 ? "grid-cols-1" : "grid-cols-2")}>
              {item.menu.map((m) => (
                <MenuCard key={m.title} m={m} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<string | null>(null);
  return (
    <header className="sticky top-0 z-50 border-b border-mk-border bg-mk-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between pl-8 pr-2 sm:pl-20 sm:pr-3">
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" aria-label={BRAND.name}>
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV.map((item) => (
              <DesktopItem key={item.label} item={item} />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-mk-muted transition-colors hover:text-mk-fg lg:flex">
            <Globe className="size-4" /> English <ChevronDown className="size-3.5 opacity-70" />
          </button>
          <Button href={BRAND.appUrl} className="hidden md:inline-flex">
            Try online
          </Button>
          <button type="button" className="rounded-lg p-2 text-mk-muted md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* mobile: collapsible with expandable sub-menus */}
      {open ? (
        <div className="max-h-[80vh] overflow-y-auto border-t border-mk-border bg-mk-bg md:hidden">
          <div className="flex flex-col gap-1 px-5 py-4">
            {NAV.map((item) => (
              <div key={item.label}>
                {item.menu ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSub((s) => (s === item.label ? null : item.label))}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-mk-fg"
                    >
                      {item.label}
                      <ChevronDown className={`size-4 opacity-70 transition-transform ${sub === item.label ? "rotate-180" : ""}`} />
                    </button>
                    {sub === item.label ? (
                      <div className="mb-1 ml-2 flex flex-col gap-0.5 border-l border-mk-border pl-3">
                        {item.menu.map((m) => (
                          <Link key={m.title} href={m.href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-mk-muted hover:text-mk-fg">
                            <Icon name={m.icon} className="size-4 text-mk-accent" /> {m.title}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <Link href={item.href ?? "#"} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-mk-muted hover:text-mk-fg">
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between">
              <button type="button" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-mk-muted">
                <Globe className="size-4" /> English
              </button>
              <Button href={BRAND.appUrl}>Try online</Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
