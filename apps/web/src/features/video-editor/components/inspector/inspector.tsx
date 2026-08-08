"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AudioLines,
  Baseline,
  Bold,
  ChevronDown,
  ChevronLeft,
  Clock,
  Droplet,
  Eraser,
  Eye,
  Film,
  FlipHorizontal,
  FlipVertical,
  Frame,
  Image as ImageIcon,
  Italic,
  Languages,
  Loader2,
  Maximize2,
  Orbit,
  Palette,
  Plus,
  RefreshCw,
  RotateCw,
  Scissors,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Sun,
  Trash2,
  Unlink,
  UserSquare,
  Volume2,
  VolumeX,
  Wand2,
  Gem,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Clip, VideoEditorAsset, VideoEditorDoc } from "../../types";
import { useInspector } from "./hooks/use-inspector";

const ACCENT = "#14b8a6";
const SPEEDS = [0.5, 1, 1.5, 2] as const;

// AI enhancements — visual for now (no back-end); shown with an upgrade/credits chip.
const AI_TOOLS: { icon: typeof Eye; title: string; desc: string; chip?: "upgrade" | number }[] = [
  { icon: Sparkles, title: "Clean Audio", desc: "Remove background noise", chip: "upgrade" },
  { icon: Eye, title: "Eye Contact", desc: "Always look at the camera", chip: "upgrade" },
  { icon: Eraser, title: "Remove Background", desc: "Auto-erase background video", chip: "upgrade" },
  { icon: AudioLines, title: "Remove Silences", desc: "Cut out dead air & awkward pauses" },
  { icon: Eraser, title: "Remove Filler Words", desc: "Like ums, ahs, and similar", chip: "upgrade" },
  { icon: Maximize2, title: "AI Background Expand", desc: "Expand video background", chip: 100 },
  { icon: ImageIcon, title: "Magic B-Roll", desc: "Supplemental images for spoken topics", chip: "upgrade" },
  { icon: Film, title: "AI Transitions", desc: "Create smooth transitions with AI" },
  { icon: Smile, title: "Face Filter", desc: "Touch-up face appearance", chip: "upgrade" },
  { icon: Scissors, title: "Magic Cut", desc: "Remove ums, ahs and bad takes" },
  { icon: Palette, title: "Green Screen", desc: "Remove a color from your video" },
];

export function Inspector({
  clip,
  doc,
  startGesture,
  preview,
  endGesture,
  onClose,
  onDelete,
  onAddText,
  onEnhance,
  assets,
  onReplace,
  onDetachAudio,
}: {
  clip: Clip;
  doc: VideoEditorDoc;
  startGesture: () => void;
  preview: (d: VideoEditorDoc) => void;
  endGesture: (changed?: boolean) => void;
  onClose: () => void;
  onDelete: () => void;
  onAddText?: () => void;
  onEnhance?: (op: "denoise" | "remove_silences" | "chroma_key" | "magic_cut" | "remove_bg" | "eye_contact" | "face_filter" | "background_expand" | "magic_broll" | "dub") => Promise<void>;
  assets?: VideoEditorAsset[];
  onReplace?: (assetId: string) => void;
  onDetachAudio?: () => Promise<void>;
}) {
  const insp = useInspector({ clip, doc, startGesture, preview, endGesture });

  return (
    <div className="flex min-h-0 flex-1 flex-col select-none">
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <button type="button" onClick={onClose} className="grid size-6 shrink-0 place-items-center rounded hover:bg-accent" title="Back">
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="text-base font-semibold capitalize">Edit {clip.kind}</h2>
      </div>

      {clip.kind === "video" ? (
        <VideoBody clip={clip} insp={insp} onDelete={onDelete} replace={<ReplaceControl kind="video" assets={assets} onReplace={onReplace} />} onDetachAudio={onDetachAudio} onEnhance={onEnhance} />
      ) : clip.kind === "audio" ? (
        <AudioBody clip={clip} insp={insp} onDelete={onDelete} onEnhance={onEnhance} replace={<ReplaceControl kind="audio" assets={assets} onReplace={onReplace} />} />
      ) : clip.kind === "image" ? (
        <ImageBody clip={clip} insp={insp} onDelete={onDelete} onEnhance={onEnhance} replace={<ReplaceControl kind="image" assets={assets} onReplace={onReplace} />} />
      ) : clip.kind === "text" ? (
        <TextBody clip={clip} insp={insp} onDelete={onDelete} onAddText={onAddText} />
      ) : (
        <GenericBody clip={clip} insp={insp} onDelete={onDelete} />
      )}
    </div>
  );
}

// Replace a clip's media with another same-kind asset from the project pool.
function ReplaceControl({ kind, assets, onReplace }: { kind: string; assets?: VideoEditorAsset[]; onReplace?: (assetId: string) => void }) {
  const [open, setOpen] = useState(false);
  const pool = (assets ?? []).filter((a) => a.kind === kind);
  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!onReplace}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
      >
        <RefreshCw className="size-4" /> Replace <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border p-2 [scrollbar-width:thin]">
          {pool.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No other {kind} in this project.</p>
          ) : kind === "audio" ? (
            <div className="space-y-1">
              {pool.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onReplace?.(a.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                >
                  <AudioLines className="size-3.5 shrink-0 text-muted-foreground" /> <span className="truncate">{fileName(a.url)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {pool.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onReplace?.(a.id);
                    setOpen(false);
                  }}
                  className="group relative aspect-video overflow-hidden rounded-md border border-border bg-secondary transition-colors hover:border-[#14b8a6]"
                  title="Replace with this"
                >
                  {kind === "video" ? (
                    // biome-ignore lint/a11y/useMediaCaption: thumbnail
                    <video src={a.url} muted playsInline preload="metadata" className="size-full object-cover" />
                  ) : (
                    // biome-ignore lint/a11y/useAltText: thumbnail
                    <img src={a.url} className="size-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function fileName(url: string) {
  try {
    return decodeURIComponent((url.split("/").pop() ?? "audio").split("?")[0]) || "audio";
  } catch {
    return "audio";
  }
}

type Insp = ReturnType<typeof useInspector>;
type GestureProps = { onPointerDown: () => void; onFocus: () => void; onBlur: () => void; onPointerUp: () => void };

function VideoBody({ clip, insp, onDelete, replace, onDetachAudio, onEnhance }: { clip: Clip; insp: Insp; onDelete: () => void; replace?: React.ReactNode; onDetachAudio?: () => Promise<void>; onEnhance?: (op: "denoise" | "remove_silences" | "chroma_key" | "magic_cut" | "remove_bg" | "eye_contact" | "face_filter" | "background_expand" | "magic_broll" | "dub") => Promise<void> }) {
  const g = insp.gestureProps;
  const [detaching, setDetaching] = useState(false);
  const detach = async () => {
    if (!onDetachAudio || detaching) return;
    setDetaching(true);
    try {
      await onDetachAudio();
    } finally {
      setDetaching(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 [scrollbar-width:thin]">
      <div className="flex gap-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <Wand2 className="size-4" /> Edit with Script
        </button>
        {replace}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TileBtn icon={Orbit} label="Animations" />
        <TileBtn icon={SlidersHorizontal} label="Adjust" />
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-secondary/60 p-1">
        <span className="px-2 text-xs text-muted-foreground">Speed</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => insp.updateSpeed(s)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
              Math.abs(clip.speed - s) < 0.001 ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s}x
          </button>
        ))}
      </div>

      <SliderRow icon={Volume2} value={clip.volume} onInput={insp.updateVolume} g={g} />

      <ToggleRow icon={AudioLines} title="Fade Audio In/Out" checked={!!clip.fadeAudio} onChange={insp.toggleFadeAudio} />

      <div>
        <div className="mb-2 flex items-center">
          <span className="text-sm font-semibold">AI Tools</span>
        </div>
        <div className="space-y-1">
          {AI_TOOLS.map((t) =>
            t.title === "Green Screen" && onEnhance ? (
              <EnhanceRow key={t.title} icon={Palette} title="Green Screen" desc="Remove green from your video" onRun={() => onEnhance("chroma_key")} />
            ) : t.title === "Remove Background" && onEnhance ? (
              <EnhanceRow key={t.title} icon={Eraser} title="Remove Background" desc="Auto-erase the background (may take a minute)" onRun={() => onEnhance("remove_bg")} />
            ) : t.title === "Eye Contact" && onEnhance ? (
              <EnhanceRow key={t.title} icon={Eye} title="Eye Contact" desc="Redirect gaze to the camera (may take a minute)" onRun={() => onEnhance("eye_contact")} />
            ) : t.title === "Face Filter" && onEnhance ? (
              <EnhanceRow key={t.title} icon={Smile} title="Face Filter" desc="Touch-up face appearance (may take a minute)" onRun={() => onEnhance("face_filter")} />
            ) : t.title === "AI Background Expand" && onEnhance ? (
              <EnhanceRow key={t.title} icon={Maximize2} title="AI Background Expand" desc="Outpaint the frame to fill (may take a minute)" onRun={() => onEnhance("background_expand")} />
            ) : t.title === "Magic B-Roll" && onEnhance ? (
              <EnhanceRow key={t.title} icon={ImageIcon} title="Magic B-Roll" desc="Add stock photos for spoken topics (may take a minute)" onRun={() => onEnhance("magic_broll")} />
            ) : (t.title === "Remove Filler Words" || t.title === "Magic Cut") && onEnhance ? (
              <EnhanceRow key={t.title} icon={t.icon} title={t.title} desc="Cut ums, uhs & filler words" onRun={() => onEnhance("magic_cut")} />
            ) : (
              <AiToolRow key={t.title} tool={t} />
            ),
          )}
          {onEnhance ? <EnhanceRow icon={Languages} title="AI Dubbing" desc="Translate & re-voice into another language" onRun={() => onEnhance("dub")} /> : null}
        </div>
      </div>

      <hr className="border-border" />

      <ToggleRow icon={Frame} title="Round Corners" checked={!!clip.transform.radius} onChange={insp.toggleRoundCorners} />

      <SliderRow icon={Droplet} label="Opacity" value={clip.transform.opacity} onInput={insp.updateOpacity} g={g} />

      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-lg bg-secondary/60 px-2.5 py-1.5">
          <RotateCw className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Rotation</span>
          <input
            type="number"
            value={Math.round(clip.transform.rotation)}
            onFocus={g.onFocus}
            onBlur={g.onBlur}
            onChange={(e) => insp.updateRotation(Number(e.target.value))}
            className="w-full min-w-0 bg-transparent text-right text-xs tabular-nums outline-none"
          />
          <span className="text-xs text-muted-foreground">°</span>
        </label>
        <IconBtn title="Flip horizontal" onClick={insp.toggleFlipH} active={clip.transform.flipH}>
          <FlipHorizontal className="size-4" />
        </IconBtn>
        <IconBtn title="Flip vertical" onClick={insp.toggleFlipV} active={clip.transform.flipV}>
          <FlipVertical className="size-4" />
        </IconBtn>
      </div>

      <hr className="border-border" />

      <div className="flex items-center gap-2">
        <TimeField label="Start" value={clip.start} onInput={insp.updateStart} g={g} />
        <TimeField label="End" value={clip.start + clip.duration} onInput={insp.updateEnd} g={g} iconRight />
      </div>

      <button
        type="button"
        onClick={detach}
        disabled={!onDetachAudio || detaching}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
      >
        {detaching ? <Loader2 className="size-4 animate-spin" /> : <Unlink className="size-4" />} {detaching ? "Detaching…" : "Detach Audio"}
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-red-500/15 hover:text-red-400"
      >
        <Trash2 className="size-4" /> Delete
      </button>
    </div>
  );
}

// A one-shot AI enhancement row: runs onRun, showing a spinner + error inline.
function EnhanceRow({ icon: Icon, title, desc, onRun }: { icon: typeof Eye; title: string; desc: string; onRun?: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    if (!onRun || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onRun();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={run}
      disabled={!onRun || busy}
      className="flex w-full items-center gap-2.5 rounded-lg bg-secondary/40 px-3 py-2.5 text-left transition-colors hover:bg-accent disabled:opacity-60"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#14b8a6]/15 text-[#14b8a6]">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{error ?? (busy ? "Processing…" : desc)}</p>
      </div>
    </button>
  );
}

function AudioBody({ clip, insp, onDelete, onEnhance, replace }: { clip: Clip; insp: Insp; onDelete: () => void; onEnhance?: (op: "denoise" | "remove_silences" | "chroma_key" | "magic_cut" | "remove_bg" | "eye_contact" | "face_filter" | "background_expand" | "magic_broll" | "dub") => Promise<void>; replace?: React.ReactNode }) {
  const g = insp.gestureProps;
  const muted = clip.volume === 0;

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 [scrollbar-width:thin]">
      <div className="flex gap-2">
        {replace}
        <button
          type="button"
          onClick={() => insp.updateVolume(muted ? 1 : 0)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />} {muted ? "Unmute" : "Mute"}
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-secondary/60 p-1">
        <span className="px-2 text-xs text-muted-foreground">Speed</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => insp.updateSpeed(s)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
              Math.abs(clip.speed - s) < 0.001 ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s}x
          </button>
        ))}
      </div>

      <SliderRow icon={Volume2} value={clip.volume} onInput={insp.updateVolume} g={g} />

      <ToggleRow icon={AudioLines} title="Fade In/Out" checked={!!clip.fadeAudio} onChange={insp.toggleFadeAudio} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">AI Tools</span>
        </div>
        <div className="space-y-1">
          <EnhanceRow icon={Sparkles} title="Clean Audio" desc="Remove background noise" onRun={onEnhance ? () => onEnhance("denoise") : undefined} />
          <EnhanceRow icon={AudioLines} title="Remove Silences" desc="Cut out dead air & awkward pauses" onRun={onEnhance ? () => onEnhance("remove_silences") : undefined} />
          {onEnhance ? (
            <EnhanceRow icon={Scissors} title="Magic Cut" desc="Remove filler words (um, uh…)" onRun={() => onEnhance("magic_cut")} />
          ) : (
            <AiToolRow tool={{ icon: Scissors, title: "Magic Cut", desc: "Remove ums, ahs and bad takes" }} />
          )}
          {onEnhance ? <EnhanceRow icon={Languages} title="AI Dubbing" desc="Translate & re-voice into another language" onRun={() => onEnhance("dub")} /> : null}
        </div>
      </div>

      <hr className="border-border" />

      <div className="flex items-center gap-2">
        <TimeField label="Start" value={clip.start} onInput={insp.updateStart} g={g} />
        <TimeField label="End" value={clip.start + clip.duration} onInput={insp.updateEnd} g={g} iconRight />
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-red-500/15 hover:text-red-400"
      >
        <Trash2 className="size-4" /> Delete Audio
      </button>
    </div>
  );
}

const ALIGNS = [
  { id: "left", icon: AlignLeft },
  { id: "center", icon: AlignCenter },
  { id: "right", icon: AlignRight },
] as const;

const FONTS = ["Inter", "Roboto", "Georgia", "Courier New", "Brush Script MT"];

function TextBody({ clip, insp, onDelete, onAddText }: { clip: Clip; insp: Insp; onDelete: () => void; onAddText?: () => void }) {
  const g = insp.gestureProps;
  const [behind, setBehind] = useState(false);
  const [spacing, setSpacing] = useState(false);
  const ts = clip.text;
  const bold = !!ts?.bold;
  const italic = !!ts?.italic;
  const align = ts?.align ?? "center";

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 [scrollbar-width:thin]">
      <textarea
        value={clip.text?.content ?? ""}
        {...g}
        onChange={(e) => insp.updateText(e.target.value)}
        rows={3}
        placeholder="Your Text"
        className="w-full resize-none rounded-lg bg-secondary/60 p-3 text-sm outline-none focus:ring-1 focus:ring-[#14b8a6]"
      />

      <p className="text-sm font-semibold">Style</p>
      <div className="flex gap-2">
        <div className="relative flex flex-1 items-center rounded-lg bg-secondary/60 px-3 text-sm transition-colors hover:bg-accent">
          <select
            value={ts?.fontFamily ?? "Inter"}
            onChange={(e) => insp.setFontFamily(e.target.value)}
            className="w-full appearance-none bg-transparent py-2.5 outline-none"
            style={{ fontFamily: ts?.fontFamily ?? "Inter" }}
          >
            {FONTS.map((f) => (
              <option key={f} value={f} className="bg-card text-foreground">
                {f}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none size-3.5 text-muted-foreground" />
        </div>
        <label className="flex w-20 items-center gap-1 rounded-lg bg-secondary/60 px-2.5 text-sm transition-colors focus-within:ring-1 focus-within:ring-[#14b8a6]">
          <input
            type="number"
            min={4}
            value={ts?.fontSize ?? 48}
            onFocus={g.onFocus}
            onBlur={g.onBlur}
            onChange={(e) => insp.setFontSize(Number(e.target.value))}
            className="w-full min-w-0 bg-transparent py-2.5 text-right tabular-nums outline-none"
          />
          <span className="text-muted-foreground">px</span>
        </label>
        <label className="relative grid size-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-border" title="Text color">
          <span className="block size-5 rounded" style={{ backgroundColor: ts?.color ?? "#ffffff" }} />
          <input type="color" value={ts?.color ?? "#ffffff"} onChange={(e) => insp.setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Text color" />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-0.5 rounded-lg bg-secondary/60 p-0.5">
          <IconToggle active={bold} onClick={insp.toggleBold} title="Bold">
            <Bold className="size-4" />
          </IconToggle>
          <IconToggle active={italic} onClick={insp.toggleItalic} title="Italic">
            <Italic className="size-4" />
          </IconToggle>
        </div>
        <div className="flex gap-0.5 rounded-lg bg-secondary/60 p-0.5">
          {ALIGNS.map((a) => (
            <IconToggle key={a.id} active={align === a.id} onClick={() => insp.setAlign(a.id)} title={`Align ${a.id}`}>
              <a.icon className="size-4" />
            </IconToggle>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSpacing((v) => !v)}
          aria-pressed={spacing}
          className={cn("grid size-9 shrink-0 place-items-center rounded-lg transition-colors", spacing ? "bg-[#14b8a6]/15 text-[#14b8a6]" : "bg-secondary/60 text-muted-foreground hover:bg-accent")}
          title="Spacing"
        >
          <Baseline className="size-4" />
        </button>
      </div>

      {spacing ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-xs">
            <span className="shrink-0 text-muted-foreground">Line</span>
            <input
              type="number"
              step={0.1}
              min={0.5}
              value={ts?.lineHeight ?? 1.2}
              onFocus={g.onFocus}
              onBlur={g.onBlur}
              onChange={(e) => insp.setLineHeight(Number(e.target.value))}
              className="w-full min-w-0 bg-transparent text-right tabular-nums outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-xs">
            <span className="shrink-0 text-muted-foreground">Letter</span>
            <input
              type="number"
              step={0.5}
              value={ts?.letterSpacing ?? 0}
              onFocus={g.onFocus}
              onBlur={g.onBlur}
              onChange={(e) => insp.setLetterSpacing(Number(e.target.value))}
              className="w-full min-w-0 bg-transparent text-right tabular-nums outline-none"
            />
          </label>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <TileBtn icon={Sun} label="Styles" />
        <TileBtn icon={Orbit} label="Animations" />
      </div>

      <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-3 py-2.5">
        <UserSquare className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-sm">Text Behind Person</span>
        <span className="grid size-4 shrink-0 place-items-center rounded bg-gradient-to-br from-amber-300 to-amber-500 text-black" title="Upgrade">
          <Gem className="size-2.5 fill-current" />
        </span>
        <Switch checked={behind} onChange={setBehind} />
      </div>

      <div className="flex items-center gap-2">
        <TimeField label="Start" value={clip.start} onInput={insp.updateStart} g={g} />
        <TimeField label="End" value={clip.start + clip.duration} onInput={insp.updateEnd} g={g} iconRight />
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-red-500/15 hover:text-red-400"
      >
        <Trash2 className="size-4" /> Delete Text
      </button>

      {onAddText ? (
        <button type="button" onClick={onAddText} className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-accent">
          <Plus className="size-4" /> Add Another Text Box
        </button>
      ) : null}
    </div>
  );
}

function IconToggle({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn("grid size-8 place-items-center rounded-md transition-colors", active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
    >
      {children}
    </button>
  );
}

function ImageBody({ clip, insp, onDelete, replace, onEnhance }: { clip: Clip; insp: Insp; onDelete: () => void; replace?: React.ReactNode; onEnhance?: (op: "denoise" | "remove_silences" | "chroma_key" | "magic_cut" | "remove_bg" | "eye_contact" | "face_filter" | "background_expand" | "magic_broll" | "dub") => Promise<void> }) {
  const g = insp.gestureProps;

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 [scrollbar-width:thin]">
      <div className="flex gap-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <Film className="size-4" /> Generate Video
        </button>
        {replace}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TileBtn icon={Orbit} label="Animations" />
        <TileBtn icon={SlidersHorizontal} label="Adjust" />
      </div>

      {onEnhance ? <EnhanceRow icon={Eraser} title="Remove Background" desc="Auto-erase the background" onRun={() => onEnhance("remove_bg")} /> : null}

      <ToggleRow icon={Frame} title="Round Corners" checked={!!clip.transform.radius} onChange={insp.toggleRoundCorners} />

      <SliderRow icon={Droplet} label="Opacity" value={clip.transform.opacity} onInput={insp.updateOpacity} g={g} />

      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-lg bg-secondary/60 px-2.5 py-1.5">
          <RotateCw className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Rotation</span>
          <input
            type="number"
            value={Math.round(clip.transform.rotation)}
            onFocus={g.onFocus}
            onBlur={g.onBlur}
            onChange={(e) => insp.updateRotation(Number(e.target.value))}
            className="w-full min-w-0 bg-transparent text-right text-xs tabular-nums outline-none"
          />
          <span className="text-xs text-muted-foreground">°</span>
        </label>
        <IconBtn title="Flip horizontal" onClick={insp.toggleFlipH} active={clip.transform.flipH}>
          <FlipHorizontal className="size-4" />
        </IconBtn>
        <IconBtn title="Flip vertical" onClick={insp.toggleFlipV} active={clip.transform.flipV}>
          <FlipVertical className="size-4" />
        </IconBtn>
      </div>

      <hr className="border-border" />

      <div className="flex items-center gap-2">
        <TimeField label="Start" value={clip.start} onInput={insp.updateStart} g={g} />
        <TimeField label="End" value={clip.start + clip.duration} onInput={insp.updateEnd} g={g} iconRight />
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-red-500/15 hover:text-red-400"
      >
        <Trash2 className="size-4" /> Delete Image
      </button>
    </div>
  );
}

function TileBtn({ icon: Icon, label }: { icon: typeof Eye; label: string }) {
  return (
    <button type="button" className="flex items-center justify-center gap-2 rounded-lg bg-secondary/60 py-2.5 text-sm font-medium transition-colors hover:bg-accent">
      <Icon className="size-4 text-muted-foreground" /> {label}
    </button>
  );
}

function IconBtn({ children, title, onClick, active }: { children: React.ReactNode; title: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
        active ? "bg-[#14b8a6]/15 text-[#14b8a6]" : "bg-secondary/60 text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={cn("flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors", checked ? "bg-[#14b8a6]" : "bg-border")}
    >
      <span className={cn("size-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}

function ToggleRow({ icon: Icon, title, checked, onChange }: { icon: typeof Eye; title: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-3 py-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm">{title}</span>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function AiToolRow({ tool }: { tool: (typeof AI_TOOLS)[number] }) {
  const [on, setOn] = useState(false);
  const Icon = tool.icon;
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-secondary/40 px-3 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#14b8a6]/15 text-[#14b8a6]">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tool.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{tool.desc}</p>
      </div>
      {tool.chip === "upgrade" ? (
        <span className="grid size-4 shrink-0 place-items-center rounded bg-gradient-to-br from-amber-300 to-amber-500 text-black" title="Upgrade">
          <Gem className="size-2.5 fill-current" />
        </span>
      ) : typeof tool.chip === "number" ? (
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-[#bbf451]">
          <Sparkles className="size-3" /> {tool.chip}
        </span>
      ) : null}
      <Switch checked={on} onChange={setOn} />
    </div>
  );
}

// Slider with a % readout, for 0–1 values (volume, opacity).
function SliderRow({ icon: Icon, label, value, onInput, g }: { icon: typeof Eye; label?: string; value: number; onInput: (v: number) => void; g: GestureProps }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      {label ? <span className="shrink-0 text-xs text-muted-foreground">{label}</span> : null}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onPointerDown={g.onPointerDown}
        onPointerUp={g.onPointerUp}
        onChange={(e) => onInput(Number(e.target.value))}
        className="h-1 min-w-0 flex-1 accent-[#14b8a6]"
      />
      <span className="w-11 shrink-0 rounded-md bg-secondary py-1 text-center text-xs tabular-nums text-muted-foreground">{Math.round(value * 100)}%</span>
    </div>
  );
}

function TimeField({ label, value, onInput, g, iconRight }: { label: string; value: number; onInput: (v: number) => void; g: GestureProps; iconRight?: boolean }) {
  return (
    <label className="flex flex-1 items-center gap-2 rounded-lg bg-secondary/60 px-2.5 py-1.5">
      {!iconRight ? <Clock className="size-4 shrink-0 text-muted-foreground" /> : null}
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        step={0.1}
        value={Number(value.toFixed(1))}
        onFocus={g.onFocus}
        onBlur={g.onBlur}
        onChange={(e) => onInput(Number(e.target.value))}
        className="w-full min-w-0 bg-transparent text-right text-xs tabular-nums outline-none"
      />
      {iconRight ? <Clock className="size-4 shrink-0 text-muted-foreground" /> : null}
    </label>
  );
}

// ── compact fallback for text / image / audio clips ─────────
function GenericBody({ clip, insp, onDelete }: { clip: Clip; insp: Insp; onDelete: () => void }) {
  const g = insp.gestureProps;
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 [scrollbar-width:thin]">
      {clip.kind === "text" ? (
        <textarea
          value={clip.text?.content ?? ""}
          {...g}
          onChange={(e) => insp.updateText(e.target.value)}
          className="w-full resize-none rounded-md border border-border bg-transparent p-2 text-sm outline-none focus:border-[#14b8a6]"
          rows={3}
        />
      ) : null}

      <Section title="Timing">
        <Row label="Start">
          <Num value={clip.start} min={0} step={0.1} g={g} onInput={insp.updateStart} suffix="s" />
        </Row>
        <Row label="Duration">
          <Num value={clip.duration} min={0.1} step={0.1} g={g} onInput={insp.updateDuration} suffix="s" />
        </Row>
        {insp.media ? (
          <Row label="Speed">
            <Num value={clip.speed} min={0.25} step={0.05} g={g} onInput={insp.updateSpeed} suffix="×" />
          </Row>
        ) : null}
      </Section>

      {insp.visual ? (
        <Section title="Transform">
          <Row label="X">
            <Num value={clip.transform.x} step={2} g={g} onInput={insp.updateX} suffix="px" />
          </Row>
          <Row label="Y">
            <Num value={clip.transform.y} step={2} g={g} onInput={insp.updateY} suffix="px" />
          </Row>
          <Row label="Opacity">
            <SliderRow icon={Droplet} value={clip.transform.opacity} onInput={insp.updateOpacity} g={g} />
          </Row>
        </Section>
      ) : null}

      {insp.media ? (
        <Section title="Audio">
          <Row label="Volume">
            <SliderRow icon={Volume2} value={clip.volume} onInput={insp.updateVolume} g={g} />
          </Row>
        </Section>
      ) : null}

      <button
        type="button"
        onClick={onDelete}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-red-500/15 hover:text-red-400"
      >
        <Trash2 className="size-4" /> Delete
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[56px_1fr] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Num({ value, min, step, suffix, g, onInput }: { value: number; min?: number; step?: number; suffix?: string; g: GestureProps; onInput: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={Number(value.toFixed(2))}
        min={min}
        step={step}
        onFocus={g.onFocus}
        onBlur={g.onBlur}
        onChange={(e) => onInput(Number(e.target.value))}
        className="w-full rounded border border-border bg-transparent px-1.5 py-1 text-xs tabular-nums outline-none focus:border-[#14b8a6]"
      />
      {suffix ? <span className="text-[11px] text-muted-foreground">{suffix}</span> : null}
    </div>
  );
}
