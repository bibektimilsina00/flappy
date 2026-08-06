"use client";

import { Folder, History, type LucideIcon, Shapes, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CREATE_NODE_KINDS, NODE_CONFIG, type NodeKind } from "../../lib/constants";
import { GenerationsPanel } from "../panels/generations-panel";
import { LibraryPanel } from "../panels/library-panel";
import { StickersPopup } from "../panels/stickers-popup";

const CREATE_ITEMS = CREATE_NODE_KINDS.map((kind) => ({
  kind,
  icon: NODE_CONFIG[kind].icon,
  label: NODE_CONFIG[kind].title,
}));

export function CanvasToolbar({
  onAddNode,
  onUploadMedia,
  onAddSticker,
}: {
  onAddNode: (kind: NodeKind) => void;
  onUploadMedia: (file: File) => void;
  onAddSticker: (variant: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"generations" | "library" | "stickers" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTab = (tab: "generations" | "library" | "stickers") => {
    setActiveTab((cur) => (cur === tab ? null : tab));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadMedia(file);
      e.target.value = "";
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto relative flex items-center gap-1 rounded-2xl border border-white/10 bg-[#18181b]/90 p-1.5 shadow-2xl backdrop-blur-xl">
        <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" onChange={handleFileChange} className="hidden" />

        <div className="flex items-center gap-1 pr-1.5 border-r border-white/10">
          {CREATE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.kind}
                type="button"
                onClick={() => onAddNode(item.kind)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-white/10 hover:text-white active:scale-95"
              >
                <Icon className="size-4 text-teal-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 pl-1.5">
          <ToolButton icon={Upload} label="Upload" onClick={() => fileInputRef.current?.click()} />
          <ToolButton icon={History} label="Generations" active={activeTab === "generations"} onClick={() => toggleTab("generations")} />
          <ToolButton icon={Folder} label="Library" active={activeTab === "library"} onClick={() => toggleTab("library")} />
          <ToolButton icon={Shapes} label="Stickers" active={activeTab === "stickers"} onClick={() => toggleTab("stickers")} />
        </div>

        {activeTab === "generations" ? <GenerationsPanel onClose={() => setActiveTab(null)} /> : null}
        {activeTab === "library" ? <LibraryPanel onClose={() => setActiveTab(null)} /> : null}
        {activeTab === "stickers" ? <StickersPopup onSelect={(variant) => { onAddSticker(variant); setActiveTab(null); }} onClose={() => setActiveTab(null)} /> : null}
      </div>
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-white/10 hover:text-white active:scale-95",
        active && "bg-white/15 text-white shadow-inner",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
