"use client";

import { Captions, ImageIcon, Music, Sparkles, Type, Video } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CategoryId, Clip, VideoEditorAsset } from "../../types";
import { AiToolsPanel } from "./ai-tools-panel";
import { MediaGrid, TextTile } from "./media-grid";

export const CATEGORIES: { id: CategoryId; label: string; icon: typeof Type }[] = [
  { id: "ai-tools", label: "AI Tools", icon: Sparkles },
  { id: "video", label: "Video", icon: Video },
  { id: "audio", label: "Audio", icon: Music },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "subtitles", label: "Subtitles", icon: Captions },
  { id: "text", label: "Text", icon: Type },
];

const TEXT_PRESETS = [
  { label: "Heading", content: "Heading", style: "text-base font-bold text-white" },
  { label: "Subheading", content: "Subheading", style: "text-sm font-semibold text-white/90" },
  { label: "Body text", content: "Body text", style: "text-xs text-white/80" },
  { label: "Caption Pill", content: "Caption Pill", style: "rounded bg-[#14b8a6] px-2 py-0.5 text-xs font-semibold text-black" },
];

export function RailBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Type; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg px-0.5 py-2 text-center text-[9px] font-medium leading-tight transition-colors select-none",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <Icon className="size-[18px] shrink-0" style={active ? { color: "#14b8a6" } : undefined} />
      {label}
    </button>
  );
}

export function LeftPanel({
  category,
  setCategory,
  assets,
  onImport,
  importing,
  onAddText,
  projectId,
  selectedClip,
}: {
  category: CategoryId;
  setCategory: (c: CategoryId) => void;
  assets: VideoEditorAsset[];
  onImport: () => void;
  importing: boolean;
  onAddText: (content: string) => void;
  projectId: string;
  selectedClip: Clip | null;
}) {
  const byKind = (k: string) => assets.filter((a) => a.kind === k);
  const title = CATEGORIES.find((c) => c.id === category)?.label ?? "";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="px-4 pb-2 pt-3.5 select-none">
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4 [scrollbar-width:thin]">
        {category === "ai-tools" ? (
          <AiToolsPanel projectId={projectId} assets={assets} selectedClip={selectedClip} setCategory={setCategory} />
        ) : category === "video" ? (
          <MediaGrid items={byKind("video")} onImport={onImport} importing={importing} empty="No video yet — generate or import." />
        ) : category === "audio" ? (
          <MediaGrid items={byKind("audio")} onImport={onImport} importing={importing} empty="No audio yet — generate or import." />
        ) : category === "image" ? (
          <MediaGrid items={byKind("image")} onImport={onImport} importing={importing} empty="No images yet — generate or import." />
        ) : category === "text" ? (
          <div className="grid gap-2 px-3">
            {TEXT_PRESETS.map((t) => (
              <TextTile key={t.label} preset={t} onAdd={onAddText} wide />
            ))}
          </div>
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">{title} — coming soon.</p>
        )}
      </div>
    </div>
  );
}
