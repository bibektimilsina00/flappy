"use client";

import { ImagePlus, type LucideIcon, Minus, Square, Smile, StickyNote } from "lucide-react";

const ITEMS: { icon: LucideIcon; label: string; variant: string }[] = [
  { icon: StickyNote, label: "Notes", variant: "note" },
  { icon: Minus, label: "Line", variant: "line" },
  { icon: Square, label: "Rectangle", variant: "rectangle" },
  { icon: Smile, label: "Emoji", variant: "emoji" },
  { icon: ImagePlus, label: "Image sticker", variant: "image" },
];

// Floating stickers menu anchored to the right of the toolbar.
export function StickersPopup({
  onSelect,
  onClose: _onClose,
}: {
  onSelect: (variant: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-full top-1/2 z-50 ml-2 w-64 -translate-y-1/2 rounded-2xl border border-border bg-popover p-2 shadow-2xl">
      {ITEMS.map(({ icon: Icon, label, variant }) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(variant)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] font-medium transition-colors hover:bg-accent"
        >
          <Icon className="size-5 text-muted-foreground" />
          {label}
        </button>
      ))}
    </div>
  );
}
