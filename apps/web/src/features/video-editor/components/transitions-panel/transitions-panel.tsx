"use client";

import { Ban, ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Clip } from "../../types";

const ACCENT = "#14b8a6";

export type MorphClip = { id: string; label: string };

// AI transition presets — visual for now (no rendering back-end). Thumbnails use
// a gradient placeholder rather than external art. Selection persists on the clip.
const TRANSITIONS = [
  { id: "Zoom In & Out", from: "#3b5b6b", to: "#8fa8ab" },
  { id: "Rotate and Pull Out", from: "#6b7bb0", to: "#c7b8d6" },
  { id: "Paper", from: "#9fb07a", to: "#e4e9d0" },
  { id: "Re-arrange", from: "#8a5a3a", to: "#c99b6e" },
  { id: "Fly", from: "#5a6b52", to: "#a8b89a" },
  { id: "Build", from: "#4a5b6b", to: "#94a4b0" },
  { id: "Orbit", from: "#7a5a3a", to: "#c4a06e" },
  { id: "Dissolve", from: "#6a7a8a", to: "#b8c4cc" },
  { id: "Glitch", from: "#b06a4a", to: "#e0a878" },
];

export function TransitionsPanel({
  clip,
  onApply,
  onBack,
  videoClips,
  onGenerateMorph,
}: {
  clip: Clip;
  onApply: (preset: string) => void;
  onBack: () => void;
  videoClips: MorphClip[];
  onGenerateMorph: (fromId: string, toId: string, prompt: string) => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  if (creating) return <AiTransitionCreate onBack={() => setCreating(false)} videoClips={videoClips} defaultFromId={clip.id} onGenerate={onGenerateMorph} />;

  const selected = clip.transition ?? "None";

  return (
    <div className="flex min-h-0 flex-1 flex-col select-none">
      <div className="flex items-center gap-2 px-3 py-3">
        <button type="button" onClick={onBack} className="grid size-6 shrink-0 place-items-center rounded hover:bg-accent" title="Back">
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="text-base font-semibold">Transitions</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <Sparkles className="size-4" /> Create new AI Transition
        </button>

        <div className="grid grid-cols-2 gap-3">
          <Tile label="None" selected={selected === "None"} onClick={() => onApply("None")}>
            <Ban className="size-8 text-muted-foreground" />
          </Tile>
          {TRANSITIONS.map((t) => (
            <Tile key={t.id} label={t.id} selected={selected === t.id} onClick={() => onApply(t.id)} style={{ background: `linear-gradient(140deg, ${t.from}, ${t.to})` }}>
              <span className="absolute right-2 top-2">
                <Sparkles className="size-4 text-[#14b8a6]" />
              </span>
            </Tile>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI transition generator — morphs between two clips' boundary frames ──────
function AiTransitionCreate({
  onBack,
  videoClips,
  defaultFromId,
  onGenerate,
}: {
  onBack: () => void;
  videoClips: MorphClip[];
  defaultFromId: string;
  onGenerate: (fromId: string, toId: string, prompt: string) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState("");
  const [fromId, setFromId] = useState(defaultFromId);
  const [toId, setToId] = useState(videoClips.find((c) => c.id !== defaultFromId)?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const canRun = fromId && toId && fromId !== toId && !busy;

  const run = async () => {
    if (!canRun) return;
    setBusy(true);
    setErr(null);
    try {
      await onGenerate(fromId, toId, prompt);
      onBack();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't generate the transition");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col select-none">
      <div className="flex items-center gap-2 px-3 py-3">
        <button type="button" onClick={onBack} className="grid size-6 shrink-0 place-items-center rounded hover:bg-accent" title="Back">
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="flex-1 text-base font-semibold">AI Transitions</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3 [scrollbar-width:thin]">
        <VideoField label="Start video" hint="Transition from the end of this clip" value={fromId} onChange={setFromId} options={videoClips} />
        <VideoField label="End video" hint="…into the start of this clip" value={toId} onChange={setToId} options={videoClips} />

        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Describe your transition. Try prompts like: shatter into glass, zoom through light, or ripple into the next video."
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-2">
            {fromId && toId && fromId === toId ? <span className="text-xs text-amber-500">Pick two different clips</span> : <span />}
            <button
              type="button"
              onClick={run}
              disabled={!canRun}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {busy ? "Generating…" : "Generate"}
            </button>
          </div>
          {err ? <p className="mt-2 text-xs text-red-400">{err}</p> : null}
        </div>
      </div>
    </div>
  );
}

function VideoField({ label, hint, value, onChange, options }: { label: string; hint: string; value: string; onChange: (v: string) => void; options: MorphClip[] }) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mb-2 text-sm text-muted-foreground">{hint}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none transition-colors hover:bg-accent focus:ring-1 focus:ring-[#14b8a6]", value ? "" : "text-muted-foreground")}
      >
        <option value="" disabled>
          Select a video…
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-card text-foreground">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Tile({
  label,
  selected,
  onClick,
  style,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col gap-1.5 text-left">
      <span
        className={cn("relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl border bg-secondary/50 transition-colors", selected ? "border-transparent ring-2 ring-[#14b8a6]" : "border-border")}
        style={style}
      >
        {children}
      </span>
      <span className={cn("text-sm", selected ? "font-medium text-[#14b8a6]" : "")}>{label}</span>
    </button>
  );
}
