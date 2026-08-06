"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export type TextPresetStyle = { fontFamily?: string; fontSize?: number; bold?: boolean; italic?: boolean; color?: string };
type Preset = { title: string; subtitle?: string; cls: string; style?: React.CSSProperties; apply: TextPresetStyle };
type Group = { tag: string; items: Preset[] };

// Text presets. Clicking a tile adds a styled text clip (its `apply` is written
// onto the clip's text and rendered in the preview); `cls`/`style` drive the tile.
const GROUPS: Group[] = [
  {
    tag: "Simple",
    items: [
      { title: "Title", cls: "text-xl font-bold", apply: { fontSize: 64, bold: true } },
      { title: "Simple", cls: "text-base font-medium", apply: { fontSize: 44 } },
      { title: "Cursive", cls: "text-xl italic", style: { fontFamily: "cursive" }, apply: { fontSize: 60, fontFamily: "cursive", italic: true } },
      { title: "Serif", cls: "text-lg", style: { fontFamily: "Georgia, serif" }, apply: { fontSize: 52, fontFamily: "Georgia, serif" } },
      { title: "Typewriter", cls: "text-sm", style: { fontFamily: "monospace" }, apply: { fontSize: 40, fontFamily: "Courier New, monospace" } },
      { title: "bold", cls: "text-xl font-extrabold", apply: { fontSize: 64, bold: true } },
    ],
  },
  {
    tag: "Title",
    items: [
      { title: "bold", subtitle: "Traditional", cls: "text-2xl font-extrabold", apply: { fontSize: 72, bold: true } },
      { title: "Editorial", subtitle: "Classic", cls: "text-lg", style: { fontFamily: "Georgia, serif" }, apply: { fontSize: 56, fontFamily: "Georgia, serif" } },
      { title: "Modern", subtitle: "Bauhaus", cls: "text-lg font-semibold", apply: { fontSize: 56, bold: true } },
      { title: "Elegant", subtitle: "Light", cls: "text-lg font-light tracking-wide", apply: { fontSize: 56 } },
      { title: "Signature", subtitle: "INDUSTRIAL", cls: "text-base italic", style: { fontFamily: "cursive" }, apply: { fontSize: 52, fontFamily: "cursive", italic: true } },
      { title: "RELIABLE", subtitle: "Typewriter", cls: "text-sm font-semibold tracking-wider", style: { fontFamily: "monospace" }, apply: { fontSize: 44, fontFamily: "Courier New, monospace", bold: true } },
    ],
  },
  {
    tag: "Lower Third",
    items: [
      { title: "Name", subtitle: "Job title", cls: "text-base font-semibold", apply: { fontSize: 44, bold: true } },
      { title: "PRESENTER", subtitle: "riocut", cls: "text-sm font-bold tracking-wide", apply: { fontSize: 40, bold: true } },
      { title: "Location", subtitle: "Subtitle", cls: "text-base italic", apply: { fontSize: 44, italic: true } },
      { title: "Speaker", subtitle: "Company", cls: "text-base font-medium", apply: { fontSize: 44 } },
    ],
  },
  {
    tag: "Other",
    items: [
      { title: "LIVE NOW", cls: "text-base font-extrabold tracking-wide", apply: { fontSize: 48, bold: true } },
      { title: "Candy Shop", cls: "text-lg font-bold", style: { color: "#a78bfa" }, apply: { fontSize: 56, bold: true, color: "#a78bfa" } },
      { title: "GOOD VIBES", cls: "text-lg font-black", apply: { fontSize: 56, bold: true } },
      { title: "THANKS FOR WATCHING", cls: "text-xs font-bold tracking-wide", apply: { fontSize: 40, bold: true } },
      { title: "Coffee hour", cls: "text-lg", style: { fontFamily: "Georgia, serif" }, apply: { fontSize: 56, fontFamily: "Georgia, serif" } },
    ],
  },
];
const TAGS = ["All", ...GROUPS.map((g) => g.tag)];

export function TextTab({ onAddText }: { onAddText: (content: string, style?: TextPresetStyle) => void }) {
  const [tag, setTag] = useState("All");
  const groups = tag === "All" ? GROUPS : GROUPS.filter((g) => g.tag === tag);

  return (
    <div className="px-3 pt-1">
      <div className="mb-5 flex flex-wrap gap-1.5">
        {TAGS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={cn("h-8 rounded-full px-3 text-xs font-semibold transition-colors", tag === t ? "bg-[#14b8a6] text-white" : "bg-secondary text-muted-foreground hover:bg-accent")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.tag}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">{g.tag}</h3>
              <button type="button" className="flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                View all <ChevronRight className="size-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {g.items.map((p) => (
                <button
                  key={`${g.tag}-${p.title}-${p.subtitle ?? ""}`}
                  type="button"
                  onClick={() => onAddText(p.title, p.apply)}
                  className="flex h-20 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg bg-secondary/60 px-2 text-center leading-tight transition-colors hover:bg-accent"
                >
                  <span className={p.cls} style={p.style}>
                    {p.title}
                  </span>
                  {p.subtitle ? <span className="text-[11px] text-muted-foreground">{p.subtitle}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
