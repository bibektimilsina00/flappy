"use client";

import { Folder, History, type LucideIcon, Shapes, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CREATE_NODE_KINDS, NODE_CONFIG, type NodeKind } from "../lib/constants";
import { GenerationsPanel } from "./generations-panel";
import { LibraryPanel } from "./library-panel";
import { StickersPopup } from "./stickers-popup";

const CREATE_ITEMS = CREATE_NODE_KINDS.map((kind) => ({
  kind,
  icon: NODE_CONFIG[kind].icon,
  label: NODE_CONFIG[kind].title,
}));

type Panel = "stickers" | "library" | "generations";

export function CanvasToolbar({
  onAddNode,
  onUpload,
  onAddSticker,
}: {
  onAddNode: (kind: NodeKind) => void;
  onUpload: (file: File) => void;
  onAddSticker: (variant: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  return (
    <>
      {panel ? <div className="fixed inset-0 z-30" onClick={() => setPanel(null)} /> : null}

      <div className="absolute left-4 top-1/2 z-50 -translate-y-1/2">
        <div className="relative flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*,audio/*,text/plain,text/markdown,.txt,.md,.markdown"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = ""; // allow re-uploading the same file
            }}
          />
          {CREATE_ITEMS.map((item) => (
            <ToolbarButton
              key={item.kind}
              icon={item.icon}
              label={item.label}
              onClick={() => onAddNode(item.kind)}
            />
          ))}
          <ToolbarButton icon={Upload} label="Upload files" onClick={() => fileInput.current?.click()} />
          <ToolbarButton
            icon={Shapes}
            label="Stickers"
            active={panel === "stickers"}
            onClick={() => toggle("stickers")}
          />

          <div className="my-1 h-px w-6 bg-border" />
          <ToolbarButton
            icon={Folder}
            label="Library"
            active={panel === "library"}
            onClick={() => toggle("library")}
          />

          <div className="my-1 h-px w-6 bg-border" />
          <ToolbarButton
            icon={History}
            label="Generations"
            active={panel === "generations"}
            onClick={() => toggle("generations")}
          />

          {panel === "stickers" ? (
            <StickersPopup
              onSelect={(variant) => {
                onAddSticker(variant);
                setPanel(null);
              }}
              onClose={() => setPanel(null)}
            />
          ) : null}
        </div>
      </div>

      {panel === "library" ? <LibraryPanel onClose={() => setPanel(null)} /> : null}
      {panel === "generations" ? <GenerationsPanel onClose={() => setPanel(null)} /> : null}
    </>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div className="group/tt relative">
      <button
        aria-label={label}
        onClick={onClick}
        className={cn(
          "grid size-10 place-items-center rounded-lg transition-colors",
          active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon className="size-5" />
      </button>
      <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-foreground opacity-0 shadow-md transition-opacity group-hover/tt:opacity-100">
        {label}
      </span>
    </div>
  );
}
