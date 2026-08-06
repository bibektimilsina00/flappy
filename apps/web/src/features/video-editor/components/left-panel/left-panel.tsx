"use client";

import { Captions, ImageIcon, Music, Palette, Shapes, Sparkles, Type, Video } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CategoryId, Clip, VideoEditorAsset } from "../../types";
import { AiToolsPanel } from "./ai-tools-panel";
import { AudioTab } from "./audio-tab";
import { BrandKitTab } from "./brand-kit-tab";
import { ElementsTab } from "./elements-tab";
import { ImageTab } from "./image-tab";
import { SubtitlesTab } from "./subtitles-tab";
import { type TextPresetStyle, TextTab } from "./text-tab";
import { VideoTab } from "./video-tab";

export const CATEGORIES: { id: CategoryId; label: string; icon: typeof Type }[] = [
  { id: "ai-tools", label: "AI Tools", icon: Sparkles },
  { id: "video", label: "Video", icon: Video },
  { id: "audio", label: "Audio", icon: Music },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "subtitles", label: "Subtitles", icon: Captions },
  { id: "text", label: "Text", icon: Type },
  { id: "elements", label: "Elements", icon: Shapes },
  { id: "brand", label: "Brand Kit", icon: Palette },
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
  onAddShape,
  onAddSubtitles,
  onAddStock,
  onTalkingCharacter,
  onApplyFont,
  onSetBackground,
  projectId,
  selectedClip,
  onOpenPlayground,
}: {
  category: CategoryId;
  setCategory: (c: CategoryId) => void;
  assets: VideoEditorAsset[];
  onImport: () => void;
  importing: boolean;
  onAddText: (content: string, style?: TextPresetStyle) => void;
  onAddShape: (type: "rect" | "rounded" | "ellipse" | "triangle" | "star", color: string) => void;
  onAddSubtitles: (segments: { start: number; end: number; text: string }[]) => void;
  onAddStock: (url: string, kind: string) => void;
  onTalkingCharacter: (imageUrl: string) => void;
  onApplyFont: (family: string) => void;
  onSetBackground: (bg: string) => void;
  projectId: string;
  selectedClip: Clip | null;
  onOpenPlayground: (mode: string) => void;
}) {
  const byKind = (k: string) => assets.filter((a) => a.kind === k);
  const title = CATEGORIES.find((c) => c.id === category)?.label ?? "";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {category === "brand" ? null : (
        <div className="px-4 pb-2 pt-3.5 select-none">
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {category === "ai-tools" ? (
          <AiToolsPanel projectId={projectId} assets={assets} selectedClip={selectedClip} setCategory={setCategory} onOpenPlayground={onOpenPlayground} />
        ) : category === "video" ? (
          <VideoTab videos={byKind("video")} onImport={onImport} importing={importing} onGenerate={() => onOpenPlayground("text-to-video")} onAddStock={onAddStock} onTalkingCharacter={onTalkingCharacter} />
        ) : category === "audio" ? (
          <AudioTab audios={byKind("audio")} onImport={onImport} importing={importing} projectId={projectId} />
        ) : category === "image" ? (
          <ImageTab images={byKind("image")} onImport={onImport} importing={importing} onGenerate={() => onOpenPlayground("text-to-image")} onAddStock={onAddStock} onSetBackground={onSetBackground} />
        ) : category === "text" ? (
          <TextTab onAddText={onAddText} />
        ) : category === "subtitles" ? (
          <SubtitlesTab projectId={projectId} onAddSubtitles={onAddSubtitles} />
        ) : category === "elements" ? (
          <ElementsTab onAddText={onAddText} onAddShape={onAddShape} onAddStock={onAddStock} />
        ) : category === "brand" ? (
          <BrandKitTab onImport={onImport} projectId={projectId} onApplyFont={onApplyFont} />
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">{title} — coming soon.</p>
        )}
      </div>
    </div>
  );
}
