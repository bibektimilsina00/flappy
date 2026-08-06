"use client";

import {
  ClipboardPaste,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Globe,
  Plus,
} from "lucide-react";
import { CREATE_NODE_KINDS, NODE_CONFIG, type NodeKind } from "../../lib/constants";

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onAddNode: (kind: NodeKind) => void;
  onPaste: () => void;
  onClose: () => void;
}

export function CanvasContextMenu({
  x,
  y,
  onAddNode,
  onPaste,
  onClose,
}: CanvasContextMenuProps) {
  const add = (kind: NodeKind) => () => {
    onAddNode(kind);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 w-56 rounded-2xl border border-border bg-popover p-1.5 shadow-2xl backdrop-blur-xl"
        style={{ left: x, top: y }}
      >
        <div className="px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Create Node
        </div>

        {CREATE_NODE_KINDS.map((kind) => {
          const cfg = NODE_CONFIG[kind];
          const Icon = cfg.icon;
          return (
            <button
              key={kind}
              type="button"
              onClick={add(kind)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-foreground/90 transition-colors hover:bg-accent"
            >
              <span className="grid size-6 place-items-center rounded-lg bg-secondary text-foreground">
                <Icon className="size-3.5" />
              </span>
              <span className="flex-1">{cfg.title}</span>
            </button>
          );
        })}

        <div className="my-1.5 h-px bg-border/60" />

        <button
          type="button"
          onClick={() => {
            onPaste();
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-foreground/90 transition-colors hover:bg-accent"
        >
          <ClipboardPaste className="size-4 text-muted-foreground" />
          <span className="flex-1">Paste node</span>
          <span className="text-[10px] font-mono text-muted-foreground">⌘V</span>
        </button>
      </div>
    </>
  );
}
