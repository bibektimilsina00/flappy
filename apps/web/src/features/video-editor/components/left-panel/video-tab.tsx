"use client";

import { ChevronRight, Plus, Upload, Wand2 } from "lucide-react";
import type { VideoEditorAsset } from "../../types";
import { MediaTileThumb } from "./media-grid";
import { StockSearch } from "./stock-search";

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

export function VideoTab({ videos, onImport, importing, onGenerate, onAddStock }: { videos: VideoEditorAsset[]; onImport: () => void; importing: boolean; onGenerate: () => void; onAddStock: (url: string, kind: string) => void }) {
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
      <Section title="Stock Videos">
        <StockSearch kind="video" onAddStock={onAddStock} />
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
