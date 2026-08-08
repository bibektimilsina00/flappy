"use client";

import { Captions, Check, Maximize, Pause, Play, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ClipItem, CustomCaptionStyle, TranscriptSegment } from "../types";
import { captionCss, PRESET_META } from "./caption-templates";

export interface CcState {
  on: boolean;
  style: string; // preset id or "custom"
}

interface Word {
  w: string;
  s: number;
  e: number;
  hl?: boolean;
}
interface Line {
  s: number; // clip-relative seconds
  e: number;
  words: Word[]; // clip-relative timings
}

// Mirror of the server ASS builder: 4-word lines, evenly spread when a
// segment was hand-edited (word timings lost).
function buildLines(transcript: TranscriptSegment[], clip: ClipItem, maxWords = 4): Line[] {
  const segments = clip.caption_edits?.length
    ? clip.caption_edits.map((s) => ({ ...s, words: [] as Word[] }))
    : transcript.filter((s) => s.end > clip.start && s.start < clip.end);
  const lines: Line[] = [];
  for (const seg of segments) {
    let words: Word[] = ((seg as { words?: Word[] }).words ?? []).filter(
      (w) => w.e > clip.start && w.s < clip.end,
    );
    if (words.length === 0) {
      const tokens = (seg.text ?? "").split(/\s+/).filter(Boolean);
      if (tokens.length === 0) continue;
      const s0 = Math.max(seg.start, clip.start);
      const e0 = Math.min(seg.end, clip.end);
      const span = (e0 - s0) / tokens.length;
      words = tokens.map((t, i) => ({ w: t, s: s0 + i * span, e: s0 + (i + 1) * span }));
    }
    for (let i = 0; i < words.length; i += maxWords) {
      const group = words.slice(i, i + maxWords).map((w) => ({ ...w, s: w.s - clip.start, e: w.e - clip.start }));
      const s = Math.max(0, group[0].s);
      const e = Math.min(clip.end - clip.start, group[group.length - 1].e);
      if (e > s) lines.push({ s, e, words: group });
    }
  }
  return lines;
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function ClipPlayer({
  clip,
  transcript,
  cc,
  onCcChange,
  customStyle,
  headline,
  onRemoveWatermark,
}: {
  clip: ClipItem;
  transcript: TranscriptSegment[];
  cc: CcState;
  onCcChange: (cc: CcState) => void;
  customStyle?: CustomCaptionStyle | null;
  headline?: { enabled: boolean; bg: string; color: string; text?: string } | null;
  // Present only for free-plan clips (which carry a burned "riocut.com" mark) —
  // clicking prompts an upgrade. Omitted for paid clips, which render clean.
  onRemoveWatermark?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(clip.end - clip.start);
  const [menuOpen, setMenuOpen] = useState(false);

  // Legacy clips (pre clean-master) have captions burned into the file —
  // overlaying would show them twice, so the caption layer is clean-only.
  const captionable = clip.clean === true;
  const subtitlesOff = cc.style === "custom" && customStyle?.subtitles === false;
  const wpl = cc.style === "custom" ? (customStyle?.words_per_line ?? 4) : 4;
  const lines = useMemo(
    () => (captionable && !subtitlesOff ? buildLines(transcript, clip, wpl) : []),
    [captionable, subtitlesOff, transcript, clip, wpl],
  );
  const line = captionable && cc.on ? lines.find((l) => t >= l.s && t <= l.e) : undefined;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  return (
    <div ref={wrapRef} className="group/player relative aspect-[9/16] w-full overflow-hidden bg-black">
      {clip.url ? (
        // biome-ignore lint/a11y/useMediaCaption: captions rendered as overlay
        <video
          key={clip.key}
          ref={videoRef}
          src={clip.url}
          playsInline
          muted={muted}
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          onDurationChange={(e) => setDur(e.currentTarget.duration || dur)}
          className="size-full cursor-pointer object-contain"
        />
      ) : null}

      {/* caption overlay — same resolver as the template cards, so WYSIWYG */}
      {line ? (
        <CaptionOverlay line={line} t={t} style={cc.style} custom={customStyle} />
      ) : null}

      {/* template logo (custom templates) */}
      {cc.on && cc.style === "custom" && customStyle?.logo ? (
        // biome-ignore lint/a11y/useAltText: brand logo overlay
        <img src={customStyle.logo} className="pointer-events-none absolute right-[4%] top-[3%] w-1/6" />
      ) : null}

      {/* headline banner — job-level option or the custom template's own */}
      {(() => {
        const h =
          cc.style === "custom" && customStyle?.headline?.enabled
            ? customStyle.headline
            : headline?.enabled
              ? headline
              : null;
        // Job-level typed title wins everywhere; template text next; AI title last.
        const text =
          (headline?.text ?? "").trim() || ((h as { text?: string } | null)?.text ?? "").trim() || clip.title;
        return cc.on && h && text ? (
          <div className="pointer-events-none absolute inset-x-3 top-[5%] flex justify-center">
            <span
              className={cn(
                "max-w-full rounded px-2 py-1 text-center text-[10px] font-extrabold uppercase leading-tight",
                h.bg === "none" && "[text-shadow:0_1px_2px_rgba(0,0,0,0.9)]",
              )}
              style={{ background: h.bg === "none" ? "transparent" : h.bg, color: h.color }}
            >
              {text}
            </span>
          </div>
        ) : null;
      })()}

      {/* free-plan watermark upsell — the clip already carries a burned mark;
          this offers to remove it (paid) and otherwise opens the pricing modal */}
      {onRemoveWatermark ? (
        <button
          type="button"
          onClick={onRemoveWatermark}
          title="Remove watermark — upgrade to a paid plan"
          className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur transition-colors hover:bg-black/75"
        >
          <Sparkles className="size-3 text-teal-300" />
          Remove watermark
        </button>
      ) : null}

      {/* center play affordance when paused */}
      {!playing ? (
        <button
          type="button"
          aria-label="Play"
          onClick={toggle}
          className="absolute inset-0 grid place-items-center"
        >
          <span className="grid size-12 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-transform hover:scale-105">
            <Play className="ml-0.5 size-5 fill-white" />
          </span>
        </button>
      ) : null}

      {/* control bar */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 transition-opacity",
          playing ? "opacity-0 group-hover/player:opacity-100" : "opacity-100",
        )}
      >
        <input
          type="range"
          min={0}
          max={dur || 1}
          step={0.05}
          value={t}
          aria-label="Seek"
          onChange={(e) => {
            const v = videoRef.current;
            if (v) v.currentTime = Number(e.target.value);
            setT(Number(e.target.value));
          }}
          className="mb-1 block h-1 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-teal-400 [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-300"
        />
        <div className="flex items-center gap-1 text-white">
          <PlayerBtn label={playing ? "Pause" : "Play"} onClick={toggle}>
            {playing ? <Pause className="size-3.5 fill-white" /> : <Play className="size-3.5 fill-white" />}
          </PlayerBtn>
          <span className="px-0.5 text-[10px] tabular-nums text-white/80">
            {fmtTime(t)} / {fmtTime(dur)}
          </span>
          <span className="flex-1" />
          <div className={cn("relative", !captionable && "hidden")}>
            <PlayerBtn label="Captions" active={cc.on} onClick={() => setMenuOpen((v) => !v)}>
              <Captions className="size-4" />
            </PlayerBtn>
            {menuOpen ? (
              <div className="absolute bottom-full right-0 z-20 mb-1.5 w-32 rounded-xl border border-white/10 bg-[#1e1e1e] p-1 shadow-2xl">
                <CcItem
                  label="Off"
                  active={!cc.on}
                  onClick={() => {
                    onCcChange({ ...cc, on: false });
                    setMenuOpen(false);
                  }}
                />
                {PRESET_META.map((s) => (
                  <CcItem
                    key={s.id}
                    label={s.name}
                    active={cc.on && cc.style === s.id}
                    onClick={() => {
                      onCcChange({ on: true, style: s.id });
                      setMenuOpen(false);
                    }}
                  />
                ))}
                {customStyle ? (
                  <CcItem
                    label={customStyle.name || "Custom"}
                    active={cc.on && cc.style === "custom"}
                    onClick={() => {
                      onCcChange({ on: true, style: "custom" });
                      setMenuOpen(false);
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          <PlayerBtn label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </PlayerBtn>
          <PlayerBtn label="Fullscreen" onClick={() => void wrapRef.current?.requestFullscreen?.()}>
            <Maximize className="size-3.5" />
          </PlayerBtn>
        </div>
      </div>
    </div>
  );
}

function CaptionOverlay({
  line,
  t,
  style,
  custom,
}: {
  line: Line;
  t: number;
  style: string;
  custom?: CustomCaptionStyle | null;
}) {
  const css = captionCss(style, custom, 1.15);
  const accent = { ...css.active };
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-2 flex justify-center",
        css.middle ? "top-1/2 -translate-y-1/2" : "bottom-[18%]",
      )}
    >
      <span
        className={cn("max-w-full text-center leading-snug", css.boxed && "rounded bg-black/60 px-1.5 py-0.5")}
        style={css.base}
      >
        {line.words.map((w, i) => (
          <span key={`${w.s}-${i}`} style={w.hl || (t >= w.s && t <= w.e) ? accent : undefined}>
            {w.w}{" "}
          </span>
        ))}
      </span>
    </div>
  );
}

function PlayerBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-md transition-colors hover:bg-white/15",
        active ? "text-teal-300" : "text-white",
      )}
    >
      {children}
    </button>
  );
}

function CcItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
        active ? "bg-teal-400/10 text-teal-300" : "text-foreground/90 hover:bg-white/5",
      )}
    >
      {label}
      {active ? <Check className="size-3.5" /> : null}
    </button>
  );
}
