"use client";

import { ChevronRight, ImagePlus, MoreHorizontal, Plus, Upload, Gem } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { VideoEditorAsset } from "../../types";
import { MediaTileThumb } from "./media-grid";

const ACCENT = "#14b8a6";

// Placeholder stock content mirroring the reference — swap for real providers
// when they exist. Thumbnails are external (Pexels / Giphy).
const STOCK_TAGS = ["All", "Business", "Nature", "Travel"];
const STOCK_IDS = ["1181717", "33144956", "746386", "705075", "1099680", "290595"];
const stockSrc = (id: string) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=350`;
const GIF_IDS = ["jGgC8JjZfLurTJSxQ8", "N8lzSpk8X4G9X6Wgca", "4H52NOaFk9oMlxdU0D", "apNr8LXrYCMsqpz5I2", "LR5GeZFCwDRcpG20PR", "3T7WB64PW315Z8zhRg"];
const gifSrc = (id: string) => `https://media.giphy.com/media/${id}/100w.gif`;
const BACKGROUNDS = [
  "linear-gradient(135deg,#3b5b6b,#8fa8ab)",
  "linear-gradient(135deg,#6b7bb0,#c7b8d6)",
  "linear-gradient(135deg,#9fb07a,#e4e9d0)",
  "linear-gradient(135deg,#8a5a3a,#c99b6e)",
  "linear-gradient(135deg,#5a6b52,#a8b89a)",
  "linear-gradient(135deg,#7a5a3a,#c4a06e)",
];

export function ImageTab({ images, onImport, importing, onGenerate, onAddStock }: { images: VideoEditorAsset[]; onImport: () => void; importing: boolean; onGenerate: () => void; onAddStock: (url: string, kind: string) => void }) {
  const [tag, setTag] = useState("All");

  return (
    <div className="space-y-8 px-3 pt-1">
      {/* generate + upload */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGenerate}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            <ImagePlus className="size-4" /> Generate
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
        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-accent">
          <ImagePlus className="size-4" /> Generate B-roll images
          <span className="grid size-4 place-items-center rounded bg-gradient-to-br from-amber-300 to-amber-500 text-black">
            <Gem className="size-2.5 fill-current" />
          </span>
        </button>
      </div>

      {/* asset library — the project's own images */}
      {images.length ? (
        <Section title="Asset Library" onAdd={onImport} viewAll>
          <div className="grid grid-cols-3 gap-2.5">
            {images.map((v) => (
              <div
                key={v.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("asset-id", v.id)}
                className="group relative aspect-[5/4] cursor-grab overflow-hidden rounded-lg border border-border bg-secondary active:cursor-grabbing"
                title="Drag onto the timeline"
              >
                <MediaTileThumb asset={v} />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* stock images */}
      <Section title="Stock Images" viewAll>
        <div className="flex flex-wrap gap-2">
          {STOCK_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={cn("h-8 rounded-full px-3 text-xs font-semibold transition-colors", tag === t ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-accent")}
            >
              {t}
            </button>
          ))}
          <button type="button" className="grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground hover:bg-accent">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {STOCK_IDS.map((id) => (
            <button key={id} type="button" onClick={() => onAddStock(stockSrc(id), "image")} className="group relative aspect-square overflow-hidden rounded-lg border border-border" title="Stock image">
              {/* biome-ignore lint/performance/noImgElement: external placeholder thumbnail */}
              <img src={stockSrc(id)} alt="" loading="lazy" className="size-full object-cover transition-transform group-hover:scale-105" />
            </button>
          ))}
        </div>
      </Section>

      {/* backgrounds */}
      <Section title="Backgrounds" viewAll>
        <div className="grid grid-cols-3 gap-2.5">
          {BACKGROUNDS.map((bg) => (
            <button key={bg} type="button" className="aspect-video rounded-lg border border-border transition-opacity hover:opacity-90" style={{ background: bg }} title="Background" />
          ))}
        </div>
      </Section>

      {/* gifs */}
      <Section title="GIFs" viewAll>
        <div className="grid grid-cols-3 gap-2.5">
          {GIF_IDS.map((id) => (
            <button key={id} type="button" onClick={() => onAddStock(gifSrc(id), "image")} className="aspect-square overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-90" title="GIF">
              {/* biome-ignore lint/performance/noImgElement: external placeholder thumbnail */}
              <img src={gifSrc(id)} alt="" loading="lazy" className="size-full object-cover" />
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
            <button type="button" onClick={onAdd} className="grid size-5 place-items-center rounded bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Upload">
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
