"use client";

import {
  ChevronRight,
  FileText,
  ImagePlus,
  type LucideIcon,
  Minus,
  Shapes,
  Smile,
  Sticker,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { CREATE_NODE_KINDS, NODE_CONFIG, type NodeKind } from "../lib/constants";

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onAddNode: (kind: NodeKind) => void;
  onClose: () => void;
}

const STICKERS = [
  { icon: Minus, label: "Line" },
  { icon: Shapes, label: "Rectangle" },
  { icon: Smile, label: "Emoji" },
  { icon: ImagePlus, label: "Image sticker" },
];

export function CanvasContextMenu({ x, y, onAddNode, onClose }: CanvasContextMenuProps) {
  const [stickersOpen, setStickersOpen] = useState(false);

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
        className="fixed z-50 w-72 rounded-xl border border-border bg-popover p-1.5 shadow-2xl"
        style={{ left: x, top: y }}
      >
        <SectionLabel>Add a node</SectionLabel>
        {CREATE_NODE_KINDS.map((kind) => (
          <MenuItem
            key={kind}
            icon={NODE_CONFIG[kind].icon}
            title={NODE_CONFIG[kind].title}
            description={NODE_CONFIG[kind].description}
            onClick={() => {
              onAddNode(kind);
              onClose();
            }}
          />
        ))}

        <SectionLabel>Note</SectionLabel>
        <MenuItem
          icon={FileText}
          title="Note"
          description="Sticky note, no inputs or outputs"
          onClick={onClose}
        />

        <SectionLabel>Stickers</SectionLabel>
        <div
          className="relative"
          onMouseEnter={() => setStickersOpen(true)}
          onMouseLeave={() => setStickersOpen(false)}
        >
          <MenuItem
            icon={Sticker}
            title="Stickers"
            description="Images, lines, shapes, and Emoji"
            hasSubmenu
          />
          {stickersOpen ? (
            <div className="absolute left-full top-0 ml-1 w-52 rounded-xl border border-border bg-popover p-1.5 shadow-2xl">
              {STICKERS.map((item) => (
                <SubItem key={item.label} icon={item.icon} label={item.label} onClick={onClose} />
              ))}
            </div>
          ) : null}
        </div>

        <SectionLabel>Upload files</SectionLabel>
        <MenuItem
          icon={Upload}
          title="Upload files"
          description="Images, videos, audio, Markdown, text"
          onClick={onClose}
        />
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-2 pb-1 pt-2 text-xs text-muted-foreground/70">{children}</p>;
}

interface MenuItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick?: () => void;
  hasSubmenu?: boolean;
}

function MenuItem({ icon: Icon, title, description, onClick, hasSubmenu }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary/50 text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      {hasSubmenu ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
    </button>
  );
}

function SubItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
    >
      <Icon className="size-4 text-muted-foreground" />
      {label}
    </button>
  );
}
