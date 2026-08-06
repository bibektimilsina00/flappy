"use client";

import { ChevronRight, MoreHorizontal, Plus, Upload, Wand2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { VideoEditorAsset } from "../../types";
import { MediaTileThumb } from "./media-grid";

const ACCENT = "#14b8a6";

// Placeholder content mirroring the reference — swap for a real characters/stock
// provider when one exists. Thumbnails are external (VEED CDN / Pexels).
const CHARACTERS = [
  { name: "Matt", id: "df11a95c-2cdb-40e5-8578-4b50260d1a4e" },
  { name: "Vicky", id: "aceb62e9-3634-44e4-a34c-f362158b1822" },
  { name: "Kyoko", id: "40f9c9a6-97de-4d54-94e1-1a31ee6b9fbd" },
  { name: "Oliver", id: "ac12e744-52be-4c99-a9a7-f7a89e310f63" },
  { name: "Ted", id: "cf638cf1-3326-4d30-9a93-e969cc5fe031" },
  { name: "Tony", id: "ca5ec8a8-efd1-421e-9faa-ca5d97ae16b4" },
  { name: "Emma", id: "11ce100d-264f-4db1-981e-eb983330dbb9" },
  { name: "Andrew", id: "cc60c88b-a880-4e78-a7fd-2e86ff89493f" },
];
const characterSrc = (id: string) => `https://cdn-user.veed.io/cdn-cgi/image/width=400,format=png/image/${id}.png`;

const STOCK_TAGS = ["All", "Aerials", "Business", "Nature"] as const;
const STOCK = [
  { dur: "0:18", src: "https://images.pexels.com/videos/3248997/free-video-3248997.jpg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
  { dur: "1:10", src: "https://images.pexels.com/videos/5646564/aerial-air-beach-calm-5646564.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
  { dur: "0:10", src: "https://images.pexels.com/videos/26898089/4k-video-above-clouds-aerial-aerial-footage-26898089.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
  { dur: "0:40", src: "https://images.pexels.com/videos/4069480/aerial-photo-aerial-photography-ariel-beach-resort-4069480.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
  { dur: "0:21", src: "https://images.pexels.com/videos/4052999/pexels-photo-4052999.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
  { dur: "0:19", src: "https://images.pexels.com/videos/3018542/free-video-3018542.jpg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200" },
];

export function VideoTab({ videos, onImport, importing, onGenerate, onAddStock }: { videos: VideoEditorAsset[]; onImport: () => void; importing: boolean; onGenerate: () => void; onAddStock: (url: string, kind: string) => void }) {
  const [tag, setTag] = useState<string>("All");

  return (
    <div className="space-y-8 px-3">
      {/* generate + upload */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onGenerate}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <Wand2 className="size-4" /> Generate
        </button>
        <button
          type="button"
          onClick={onImport}
          disabled={importing}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Upload className="size-4" /> {importing ? "Uploading…" : "Upload"}
        </button>
      </div>

      {/* asset library — the project's own videos */}
      {videos.length ? (
        <Section title="Asset Library" onAdd={onImport} viewAll>
          <div className="grid grid-cols-3 gap-2.5">
            {videos.map((v) => (
              <div
                key={v.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("asset-id", v.id)}
                className="group relative cursor-grab overflow-hidden rounded-lg border border-border bg-secondary active:cursor-grabbing"
                title="Drag onto the timeline"
              >
                <MediaTileThumb asset={v} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* talking characters */}
      <Section title="Talking Characters" viewAll>
        <div className="grid grid-cols-3 gap-2.5">
          {CHARACTERS.map((c) => (
            <button key={c.id} type="button" onClick={() => onAddStock(characterSrc(c.id), "image")} className="overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-90" title={c.name}>
              {/* biome-ignore lint/performance/noImgElement: external placeholder thumbnail */}
              <img src={characterSrc(c.id)} alt={c.name} loading="lazy" className="aspect-square w-full object-cover object-top" />
            </button>
          ))}
        </div>
      </Section>

      {/* stock videos */}
      <Section title="Stock Videos" viewAll>
        <div className="flex flex-wrap gap-2">
          {STOCK_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={cn(
                "h-7 rounded-full px-3 text-xs font-semibold transition-colors",
                tag === t ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-accent",
              )}
            >
              {t}
            </button>
          ))}
          <button type="button" className="grid size-7 place-items-center rounded-full bg-secondary text-muted-foreground hover:bg-accent">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {STOCK.map((s) => (
            <button key={s.src} type="button" className="group relative aspect-video overflow-hidden rounded-lg border border-border" title="Stock video">
              {/* biome-ignore lint/performance/noImgElement: external placeholder thumbnail */}
              <img src={s.src} alt="" loading="lazy" className="size-full object-cover transition-transform group-hover:scale-105" />
              <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] tabular-nums text-white backdrop-blur-sm">{s.dur}</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, viewAll, onAdd, children }: { title: string; viewAll?: boolean; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className="grid size-5 place-items-center rounded bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Upload"
            >
              <Plus className="size-3.5" />
            </button>
          ) : null}
        </div>
        {viewAll ? (
          <button type="button" className="flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            View all <ChevronRight className="size-3.5" />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
