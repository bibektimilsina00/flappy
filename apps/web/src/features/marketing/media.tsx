import { Play } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Cinematic colour fields used as stand-ins for generated media. Swap any Poster for a
// real asset by passing `src` (image) or `video` — the layout stays identical.
const TONES: Record<string, string> = {
  teal: "from-[#0e3a35] via-[#12564d] to-[#14b8a6]",
  indigo: "from-[#131a3a] via-[#243b6b] to-[#4f46e5]",
  violet: "from-[#241540] via-[#4c2a7a] to-[#7c5cff]",
  amber: "from-[#3a2a0e] via-[#7a4e12] to-[#f5a524]",
  rose: "from-[#3a1220] via-[#7a1e3a] to-[#f43f5e]",
  slate: "from-[#15161a] via-[#23252b] to-[#3a3d46]",
};
const ORDER = ["teal", "indigo", "violet", "amber", "rose"];
export const toneAt = (i: number) => ORDER[i % ORDER.length];

export function Poster({
  tone = "teal",
  ratio = "16 / 9",
  label,
  badge,
  play,
  src,
  video,
  className,
  style,
}: {
  tone?: string;
  ratio?: string;
  label?: string;
  badge?: ReactNode;
  play?: boolean;
  src?: string;
  video?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ aspectRatio: ratio, ...style }} className={cn("group relative overflow-hidden rounded-2xl border border-mk-border", className)}>
      {src ? (
        // biome-ignore lint/a11y/useAltText: decorative placeholder media
        // biome-ignore lint/nursery/noImgElement: marketing static image, next/image not needed
        <img src={src} alt={label ?? ""} className="size-full object-cover" />
      ) : video ? (
        // biome-ignore lint/a11y/useMediaCaption: decorative placeholder media
        <video className="size-full object-cover" src={video} autoPlay muted loop playsInline />
      ) : (
        <div className={cn("size-full bg-gradient-to-br", TONES[tone] ?? TONES.teal)} />
      )}

      {/* cinematic vignette for depth + text legibility */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.45),transparent_45%)]" />

      {play ? (
        <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur transition-transform duration-200 group-hover:scale-105">
          <Play className="size-6 translate-x-0.5 text-white" />
        </span>
      ) : null}

      {label ? <span className="absolute bottom-3 left-3.5 text-sm font-semibold text-white drop-shadow">{label}</span> : null}
      {badge ? (
        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">{badge}</span>
      ) : null}
    </div>
  );
}
