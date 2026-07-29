"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

type GlyphProps = { className?: string };
const Glyph = (d: string, viewBox = "0 0 24 24") =>
  function BrandGlyph({ className }: GlyphProps) {
    return (
      <svg viewBox={viewBox} className={className} fill="currentColor" fillRule="evenodd" aria-hidden="true">
        <path d={d} />
      </svg>
    );
  };

const ICONS = [
  { name: "TikTok", bg: "bg-black text-white", pos: "left-[38%] top-[8%]", icon: Glyph("M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.05.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z") },
  { name: "X", bg: "bg-white text-black", pos: "right-[18%] top-[5%]", icon: Glyph("M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z") },
  { name: "Facebook", bg: "bg-[#1877F2] text-white", pos: "left-[12%] top-[32%]", icon: Glyph("M13.4 21v-8.1h2.72l.4-3.16H13.4V7.72c0-.91.25-1.53 1.56-1.53h1.67V3.36c-.29-.04-1.28-.13-2.43-.13-2.4 0-4.05 1.47-4.05 4.16v2.32H7.43v3.16h2.72V21h3.25z") },
  { name: "LinkedIn", bg: "bg-[#0A66C2] text-white", pos: "left-[52%] top-[38%]", icon: Glyph("M6.94 8.5v12H3.56v-12h3.38zM7.07 5.25a1.82 1.82 0 1 1-1.83-1.82 1.82 1.82 0 0 1 1.83 1.82zM20.5 13.9v6.6h-3.37v-6.2c0-1.56-.56-2.62-1.96-2.62a2.11 2.11 0 0 0-1.98 1.41 2.64 2.64 0 0 0-.13.94v6.47H9.68v-12h3.38v1.71a3.35 3.35 0 0 1 3.04-1.68c2.22 0 3.9 1.45 3.9 4.57z") },
  { name: "YouTube", bg: "bg-[#FF0000] text-white", pos: "right-[8%] top-[35%]", icon: Glyph("M10 15V9l5.2 3zM21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 0 0 2.42 7.19 26 26 0 0 0 2 12a26 26 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.42-4.81z") },
  { name: "Instagram", bg: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white", pos: "left-[34%] top-[58%]", icon: Glyph("M12 8.75A3.25 3.25 0 1 0 15.25 12 3.25 3.25 0 0 0 12 8.75zm0-2.5A5.75 5.75 0 1 1 6.25 12 5.75 5.75 0 0 1 12 6.25zm6.5-.75a1.25 1.25 0 1 1-1.25-1.25A1.25 1.25 0 0 1 18.5 5.5zM12 3.5c-2.72 0-3.06 0-4.12.06a5.6 5.6 0 0 0-1.88.35 3.77 3.77 0 0 0-2.16 2.16 5.6 5.6 0 0 0-.35 1.88C3.5 8.94 3.5 9.28 3.5 12s0 3.06.06 4.12a5.6 5.6 0 0 0 .35 1.88 3.77 3.77 0 0 0 2.16 2.16 5.6 5.6 0 0 0 1.88.35c1.06.06 1.4.06 4.12.06s3.06 0 4.12-.06a5.6 5.6 0 0 0 1.88-.35 3.77 3.77 0 0 0 2.16-2.16 5.6 5.6 0 0 0 .35-1.88c.06-1.06.06-1.4.06-4.12s0-3.06-.06-4.12a5.6 5.6 0 0 0-.35-1.88 3.77 3.77 0 0 0-2.16-2.16 5.6 5.6 0 0 0-1.88-.35C15.06 3.5 14.72 3.5 12 3.5z") },
];

// Right-side "Publish to social" sheet. Honest state: platform account
// connections (OAuth apps) aren't registered yet, so publishing is gated
// behind Connect — the panel says so instead of pretending.
export function PublishPanel({ clipTitle, onClose }: { clipTitle: string; onClose: () => void }) {
  const [note, setNote] = useState(false);
  return (
    <div className="dark fixed inset-0 z-[200] bg-black/60" onClick={onClose}>
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-[#191919] text-foreground shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold">Publish to social</h3>
            <p className="truncate text-xs text-muted-foreground">{clipTitle}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          {/* floating platform icons */}
          <div className="relative mb-8 h-48 w-full max-w-[280px]">
            <div className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/10 blur-3xl" />
            {ICONS.map((p, i) => (
              <span
                key={p.name}
                title={p.name}
                style={{ animationDelay: `${i * 0.5}s` }}
                className={cn(
                  "absolute grid size-12 place-items-center rounded-full shadow-xl animate-[clip-float_5s_ease-in-out_infinite]",
                  p.bg,
                  p.pos,
                )}
              >
                <p.icon className="size-5" />
              </span>
            ))}
          </div>

          <h4 className="text-lg font-semibold">Connect an account first</h4>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            You'll be able to publish this clip once at least one social account is connected.
          </p>

          <button
            type="button"
            onClick={() => setNote(true)}
            className="mt-7 flex items-center gap-2 rounded-xl bg-teal-400/15 px-5 py-3 text-sm font-semibold text-teal-300 transition-colors hover:bg-teal-400/25"
          >
            <Plus className="size-4" /> Connect account
          </button>
          {note ? (
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-amber-300/90">
              Account connections need each platform's developer app approval — registration is in progress.
              Until then, download the clip and post it from the platform's app.
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
