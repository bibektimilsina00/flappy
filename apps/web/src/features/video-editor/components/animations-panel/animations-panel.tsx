"use client";

import { Ban, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Clip } from "../../types";

const ACCENT = "#14b8a6";

const TABS = [
  { id: "in", label: "In" },
  { id: "out", label: "Out" },
  { id: "loop", label: "Loop" },
  { id: "zoom", label: "Zoom" },
];

// Preset ids per tab. Visual-only for now (no playback rendering yet); the
// selection is persisted on the clip so it survives reselect.
const PRESETS: Record<string, string[]> = {
  in: ["None", "Fade", "Float", "Zoom In", "Ken Burns In", "Drop", "Slide", "Wipe", "Pop", "Bounce", "Spin", "Slide bounce", "Gentle float"],
  out: ["None", "Fade", "Float", "Zoom Out", "Ken Burns Out", "Drop", "Slide", "Wipe", "Pop", "Bounce", "Spin"],
  loop: ["None", "Pulse", "Wobble", "Spin", "Float", "Bounce", "Shake"],
  zoom: ["None", "Zoom In", "Zoom Out", "Ken Burns In", "Ken Burns Out"],
};

export function AnimationsPanel({ clip, onApply, onBack }: { clip: Clip; onApply: (tab: string, preset: string) => void; onBack: () => void }) {
  const [tab, setTab] = useState<string>("in");
  const selected = clip.animations?.[tab] ?? "None";

  return (
    <div className="flex min-h-0 flex-1 flex-col select-none">
      <div className="flex items-center gap-2 px-3 py-3">
        <button type="button" onClick={onBack} className="grid size-6 shrink-0 place-items-center rounded hover:bg-accent" title="Back">
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="text-base font-semibold">Animations</h2>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex-1 py-2.5 text-sm font-medium transition-colors",
              tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ backgroundColor: ACCENT }} /> : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
        <div className="grid grid-cols-3 gap-2.5">
          {PRESETS[tab].map((preset) => {
            const on = selected === preset;
            const isNone = preset === "None";
            return (
              <button key={preset} type="button" onClick={() => onApply(tab, preset)} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "grid aspect-square w-full place-items-center rounded-xl border transition-colors",
                    on ? "border-transparent ring-2" : "border-border hover:border-muted-foreground/40",
                  )}
                  style={on ? ({ backgroundColor: "#14b8a61a", "--tw-ring-color": ACCENT } as React.CSSProperties) : undefined}
                >
                  {isNone ? (
                    <Ban className="size-8" style={{ color: on ? ACCENT : "var(--muted-foreground)" }} />
                  ) : (
                    <span className="size-8 rounded-md bg-muted-foreground/60" />
                  )}
                </span>
                <span className={cn("text-xs", on ? "font-medium" : "text-muted-foreground")} style={on ? { color: ACCENT } : undefined}>
                  {preset}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
