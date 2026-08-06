"use client";

import { ChevronRight, ImagePlus, Plus, Upload, Gem } from "lucide-react";
import type { VideoEditorAsset } from "../../types";
import { MediaTileThumb } from "./media-grid";
import { StockSearch } from "./stock-search";

const ACCENT = "#14b8a6";

// GIF stickers stay curated (Giphy needs its own key); stock images/videos are
// live via Pexels (StockSearch). Thumbnails are external.
const GIF_IDS = ["jGgC8JjZfLurTJSxQ8", "N8lzSpk8X4G9X6Wgca", "4H52NOaFk9oMlxdU0D", "apNr8LXrYCMsqpz5I2", "LR5GeZFCwDRcpG20PR", "3T7WB64PW315Z8zhRg"];
const gifSrc = (id: string) => `https://media.giphy.com/media/${id}/100w.gif`;
// Solid colours (render-safe — export honours a solid `background`; gradients
// wouldn't burn into the MP4). Clicking sets the project background.
const BACKGROUNDS = ["#000000", "#ffffff", "#14b8a6", "#1e293b", "#3b5b6b", "#8a5a3a", "#6b7bb0", "#9fb07a", "#c99b6e"];

export function ImageTab({ images, onImport, importing, onGenerate, onAddStock, onSetBackground }: { images: VideoEditorAsset[]; onImport: () => void; importing: boolean; onGenerate: () => void; onAddStock: (url: string, kind: string) => void; onSetBackground: (bg: string) => void }) {
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
      <Section title="Stock Images">
        <StockSearch kind="image" onAddStock={onAddStock} />
      </Section>

      {/* backgrounds */}
      <Section title="Backgrounds" viewAll>
        <div className="grid grid-cols-3 gap-2.5">
          {BACKGROUNDS.map((bg) => (
            <button key={bg} type="button" onClick={() => onSetBackground(bg)} className="aspect-video rounded-lg border border-border transition-opacity hover:opacity-90" style={{ background: bg }} title="Set as background" />
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
