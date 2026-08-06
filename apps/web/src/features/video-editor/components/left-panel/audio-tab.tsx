"use client";

import { AudioLines, ChevronRight, MessageSquareText, Mic, MoreHorizontal, Play, Plus, Upload, Gem } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { VideoEditorAsset } from "../../types";
import { AddTts } from "./add-tts";

const ACCENT = "#14b8a6";

// Placeholder stock content mirroring the reference — swap for a real provider
// when one exists. Playback / add are visual stubs for stock rows.
const MUSIC_TAGS = ["All", "Free", "Now Trending", "Lifestyle Vlog"];
const MUSIC = [
  { name: "Recess", dur: "3:54" },
  { name: "Happy Mood", dur: "2:31" },
  { name: "Brooklyn", dur: "2:15" },
  { name: "LEGENDS", dur: "2:31" },
  { name: "Endelea Kusonga", dur: "5:22" },
];
const SFX_TAGS = ["All", "Swooshes", "Ambience", "Water"];
const SFX = [
  { name: "Swooshes, Whoosh, Wood, Roll Long", dur: "0:06" },
  { name: "Ambience, Scifi, Alien Spaceship, Drone 03", dur: "1:12" },
  { name: "Water, Wave, Waves, Sea, Beach", dur: "3:00" },
  { name: "WW2, Car, Onboard Driving, Stop", dur: "0:58" },
];

// A fixed faint waveform strip (deterministic — no per-render randomness).
const WAVE = [6, 10, 14, 9, 16, 22, 18, 12, 20, 26, 17, 11, 21, 30, 24, 14, 19, 28, 16, 10, 23, 31, 20, 13, 18, 27, 15, 9, 22, 29, 19, 12, 17, 25, 14, 8, 20, 28, 18, 11];

export function AudioTab({ audios, onImport, importing, projectId }: { audios: VideoEditorAsset[]; onImport: () => void; importing: boolean; projectId: string }) {
  const [tts, setTts] = useState(false);
  if (tts) return <AddTts onBack={() => setTts(false)} projectId={projectId} />;

  return (
    <div className="space-y-8 px-3 pt-1">
      {/* AI voice + upload */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTts(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <MessageSquareText className="size-4" /> AI voice
        </button>
        <button
          type="button"
          onClick={onImport}
          disabled={importing}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Upload className="size-4" /> {importing ? "Uploading…" : "Upload"}
        </button>
      </div>

      {/* Voice */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid size-4 place-items-center rounded bg-gradient-to-br from-amber-300 to-amber-500 text-black" title="Upgrade">
            <Gem className="size-2.5 fill-current" />
          </span>
          <h3 className="text-[15px] font-semibold">Voice</h3>
        </div>
        <div className="flex gap-3">
          <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-accent">
            <AudioLines className="size-4" /> Voice Cloning
          </button>
          <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-medium transition-colors hover:bg-accent">
            <Mic className="size-4" /> Voiceover
          </button>
        </div>
      </div>

      {/* Asset Library — the project's own audio */}
      {audios.length ? (
        <Section title="Asset Library" onAdd={onImport} viewAll>
          <div className="space-y-2.5">
            {audios.map((a) => (
              <AudioRow key={a.id} name={fileName(a.url)} dur="" draggableId={a.id} />
            ))}
          </div>
        </Section>
      ) : null}

      <StockSection title="Stock Music" tags={MUSIC_TAGS} items={MUSIC} />
      <StockSection title="Sound Effects" tags={SFX_TAGS} items={SFX} />
    </div>
  );
}

function StockSection({ title, tags, items }: { title: string; tags: string[]; items: { name: string; dur: string }[] }) {
  const [tag, setTag] = useState("All");
  return (
    <Section title={title} viewAll>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={cn("h-8 rounded-full px-3 text-xs font-semibold transition-colors", tag === t ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-accent")}
          >
            {t}
          </button>
        ))}
        <button type="button" className="grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground hover:bg-accent">
          <MoreHorizontal className="size-4" />
        </button>
      </div>
      <div className="mt-3 space-y-2.5">
        {items.map((s) => (
          <AudioRow key={s.name} name={s.name} dur={s.dur} />
        ))}
      </div>
    </Section>
  );
}

function AudioRow({ name, dur, draggableId }: { name: string; dur: string; draggableId?: string }) {
  return (
    <div
      draggable={!!draggableId}
      onDragStart={draggableId ? (e) => e.dataTransfer.setData("asset-id", draggableId) : undefined}
      className={cn("group relative flex h-[70px] items-center gap-3 overflow-hidden rounded-lg border border-border p-3", draggableId && "cursor-grab active:cursor-grabbing")}
    >
      {/* faint waveform behind */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-6 items-end gap-px px-1 opacity-20">
        {WAVE.map((h, i) => (
          <span key={`${name}-${i}`} className="flex-1 rounded-sm bg-muted-foreground" style={{ height: `${h}px` }} />
        ))}
      </div>
      <button type="button" className="relative grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Play">
        <Play className="size-4 fill-current" />
      </button>
      <div className="relative z-[1] min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {dur ? <p className="text-sm text-muted-foreground tabular-nums">{dur}</p> : null}
      </div>
      <button
        type="button"
        title="Add to timeline"
        className="relative grid size-8 shrink-0 place-items-center rounded-lg text-white opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: ACCENT }}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function Section({ title, viewAll, onAdd, children }: { title: string; viewAll?: boolean; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {onAdd ? (
            <button type="button" onClick={onAdd} className="grid size-5 place-items-center rounded bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Upload">
              <Plus className="size-3.5" />
            </button>
          ) : null}
        </div>
        {viewAll ? (
          <button type="button" className="flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            View all <ChevronRight className="size-3.5" />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function fileName(url: string) {
  try {
    const last = url.split("/").pop() ?? "Audio";
    return decodeURIComponent(last.split("?")[0]) || "Audio";
  } catch {
    return "Audio";
  }
}
