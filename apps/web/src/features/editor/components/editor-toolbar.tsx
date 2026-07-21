"use client";

import { Folder, History, type LucideIcon, Shapes, Upload } from "lucide-react";
import { useRef } from "react";
import { CREATE_NODE_KINDS, NODE_CONFIG, type NodeKind } from "../constants";

const CREATE_ITEMS = CREATE_NODE_KINDS.map((kind) => ({
  kind,
  icon: NODE_CONFIG[kind].icon,
  label: NODE_CONFIG[kind].title,
}));

export function EditorToolbar({
  onAddNode,
  onUpload,
}: {
  onAddNode: (kind: NodeKind) => void;
  onUpload: (file: File) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
      <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-2">
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
        <ToolbarButton icon={Shapes} label="Stickers" />

        <div className="my-1 h-px w-6 bg-border" />
        <ToolbarButton icon={Folder} label="Library" />

        <div className="my-1 h-px w-6 bg-border" />
        <ToolbarButton icon={History} label="Generations" />
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-5" />
    </button>
  );
}
