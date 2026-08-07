"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { TOOL_TABS } from "../lib/content";
import { media, Poster } from "./media";
import { Button, Container, Section, SectionHeading } from "./ui";

export function FeatureTabs() {
  const [open, setOpen] = useState(0);

  return (
    <Section id="tools">
      <Container>
        <SectionHeading
          center={false}
          eyebrow="The toolkit"
          title="Everything you need, end to end."
          sub="Reliable, essential tools for generating, editing, and finishing video — all in one place."
          action={<Button href="/login">Try online</Button>}
        />

        <div className="mt-12 overflow-hidden rounded-3xl border border-mk-border">
          {TOOL_TABS.map((t, i) => {
            const on = i === open;
            return (
              <div key={t.n} className={cn("border-mk-border", i > 0 && "border-t")}>
                <button
                  type="button"
                  onClick={() => setOpen(on ? -1 : i)}
                  className={cn("flex w-full items-center gap-6 px-6 py-6 text-left transition-colors sm:px-8", on ? "bg-mk-surface" : "hover:bg-mk-surface/50")}
                >
                  <span className={cn("text-lg font-bold tabular-nums", on ? "text-mk-accent" : "text-mk-faint")}>{t.n}</span>
                  <span className={cn("flex-1 text-xl font-bold tracking-tight sm:text-2xl", on ? "text-mk-fg" : "text-mk-muted")}>{t.label}</span>
                  <span className="grid size-7 place-items-center rounded-full text-mk-muted">{on ? <Minus className="size-5" /> : <Plus className="size-5" />}</span>
                </button>

                {on ? (
                  <div className="grid items-center gap-8 bg-mk-surface px-6 pb-8 sm:px-8 md:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-semibold text-mk-fg">{t.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-mk-muted">{t.desc}</p>
                      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                        {t.bullets.map((b) => (
                          <li key={b} className="flex items-center gap-2 text-sm text-mk-fg/90">
                            <Check className="size-4 shrink-0 text-mk-accent" /> {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Poster src={media(t.img, 800)} label={t.media} ratio="4 / 3" play />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
