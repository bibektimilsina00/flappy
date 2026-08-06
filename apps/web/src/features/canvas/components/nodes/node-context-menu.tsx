"use client";

import {
  ArrowUpToLine,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Lock,
  LockOpen,
  type LucideIcon,
  Play,
  Trash2,
} from "lucide-react";

interface NodeContextMenuProps {
  x: number;
  y: number;
  locked: boolean;
  onRun: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onBringToFront: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NodeContextMenu({
  x,
  y,
  locked,
  onRun,
  onDuplicate,
  onCopy,
  onPaste,
  onBringToFront,
  onToggleLock,
  onDelete,
  onClose,
}: NodeContextMenuProps) {
  const run = (fn: () => void) => () => {
    fn();
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
        className="fixed z-50 w-52 rounded-xl border border-border bg-popover p-1.5 shadow-2xl"
        style={{ left: x, top: y }}
      >
        <Item icon={Play} label="Run" shortcut="⏎" onClick={run(onRun)} />
        <Item icon={CopyPlus} label="Duplicate" shortcut="⌘D" onClick={run(onDuplicate)} />
        <div className="my-1 h-px bg-border" />
        <Item icon={Copy} label="Copy" shortcut="⌘C" onClick={run(onCopy)} />
        <Item icon={ClipboardPaste} label="Paste" shortcut="⌘V" onClick={run(onPaste)} />
        <Item icon={ArrowUpToLine} label="Bring to front" onClick={run(onBringToFront)} />
        <Item
          icon={locked ? LockOpen : Lock}
          label={locked ? "Unlock" : "Lock"}
          onClick={run(onToggleLock)}
        />
        <div className="my-1 h-px bg-border" />
        <Item icon={Trash2} label="Delete" shortcut="⌫" destructive onClick={run(onDelete)} />
      </div>
    </>
  );
}

function Item({
  icon: Icon,
  label,
  shortcut,
  destructive,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent ${
        destructive ? "text-destructive hover:text-destructive" : "text-foreground/90"
      }`}
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {shortcut ? <span className="text-xs text-muted-foreground">{shortcut}</span> : null}
    </button>
  );
}
