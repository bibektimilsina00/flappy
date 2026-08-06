"use client";

import { ChevronRight, Circle, Square, Star, Triangle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const EMOJIS = ["😂", "😍", "🔥", "✨", "👍", "🎉", "💯", "❤️"];
const SHAPES = [
  { id: "rect", icon: Square, color: "#ff4c45" },
  { id: "rounded", icon: Square, color: "#3cadff" },
  { id: "ellipse", icon: Circle, color: "#ffd646" },
  { id: "triangle", icon: Triangle, color: "#a46cff" },
  { id: "star", icon: Star, color: "#6edfa3" },
] as const;
const STICKER_GIFS = ["S3zCBYTwOXlw6o8j84", "Pvlj8swUlQHwXRa0Ml", "Hn7Q2GvGZfgV4YnJsr", "l4FGI8GoTL7N4DsyI"];
const gifSrc = (id: string) => `https://media.giphy.com/media/${id}/100w.gif`;
const TAGS = ["All", "Stickers", "Shapes", "Visualizers"];

type ShapeType = "rect" | "rounded" | "ellipse" | "triangle" | "star";

export function ElementsTab({ onAddText, onAddShape }: { onAddText: (content: string) => void; onAddShape: (type: ShapeType, color: string) => void }) {
  const [tag, setTag] = useState("All");
  const show = (t: string) => tag === "All" || tag === t;

  return (
    <div className="px-3 pt-1">
      <div className="mb-5 flex flex-wrap gap-2">
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

      <div className="space-y-8">
        {show("Stickers") ? (
          <Section title="Stickers">
            <div className="grid grid-cols-4 gap-2.5">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => onAddText(e)} className="grid aspect-square place-items-center rounded-lg bg-secondary/60 text-3xl transition-colors hover:bg-accent" title="Emoji">
                  {e}
                </button>
              ))}
            </div>
          </Section>
        ) : null}

        {show("Stickers") ? (
          <Section title="Animated Stickers">
            <div className="grid grid-cols-4 gap-2.5">
              {STICKER_GIFS.map((id) => (
                <button key={id} type="button" className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-secondary/60 transition-opacity hover:opacity-90" title="Animated sticker">
                  {/* biome-ignore lint/performance/noImgElement: external placeholder thumbnail */}
                  <img src={gifSrc(id)} alt="" loading="lazy" className="size-full object-contain" />
                </button>
              ))}
            </div>
          </Section>
        ) : null}

        {show("Shapes") ? (
          <Section title="Shapes">
            <div className="grid grid-cols-4 gap-2.5">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onAddShape(s.id, s.color)}
                  className="grid aspect-square place-items-center rounded-lg bg-secondary/60 transition-colors hover:bg-accent"
                  title={s.id}
                >
                  <s.icon className="size-8" style={{ color: s.color, fill: s.color }} />
                </button>
              ))}
            </div>
          </Section>
        ) : null}

        {show("Visualizers") ? (
          <Section title="Visualizers">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="grid h-20 place-items-center rounded-lg border-4 border-[#6edfa3] bg-secondary/40 text-xs text-muted-foreground">Rainbow border</div>
              <div className="flex h-20 items-center rounded-lg bg-secondary/40 px-3">
                <span className="h-2 w-2/3 rounded-full bg-[#3cadff]" />
                <span className="h-2 flex-1 rounded-full bg-border" />
              </div>
              <div className="grid h-20 place-items-center rounded-lg bg-secondary/40 text-xs text-muted-foreground">Sound wave</div>
              <div className="grid h-20 place-items-center rounded-lg bg-secondary/40 text-2xl font-bold text-[#ff4c45]">3</div>
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <button type="button" className="flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          View all <ChevronRight className="size-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}
