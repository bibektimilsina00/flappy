"use client";

import { Captions, ChevronDown, ChevronLeft, Info, PenLine, Upload, Gem } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const ACCENT = "#14b8a6";

// Subtitle generator — visual for now (no transcription back-end). Toggles hold
// local state; the create/manual/import actions are stubs.
export function SubtitlesTab() {
  const [translate, setTranslate] = useState(false);
  const [speakers, setSpeakers] = useState(false);
  const [manual, setManual] = useState(false);

  if (manual) return <ManualSubtitles onBack={() => setManual(false)} />;

  return (
    <div className="px-3 pt-1">
      <div className="mx-auto flex max-w-[25rem] flex-col gap-6 py-6">
        <Field label="What do you want to transcribe?">
          <Dropdown value="Full project" right="0:30" />
        </Field>

        <Field label="What language is being spoken?">
          <Dropdown value="English" badge="US" sub="English (US)" />
        </Field>

        <ToggleRow label="Add translation" checked={translate} onChange={setTranslate} />
        <ToggleRow label="Detect Speakers" checked={speakers} onChange={setSpeakers} upgrade info />

        <button
          type="button"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <Captions className="size-4" /> Auto-subtitle in English
        </button>

        <div className="-mx-3 border-b border-border" />

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">More Options</p>
          <button
            type="button"
            onClick={() => setManual(true)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-secondary text-sm font-medium transition-colors hover:bg-accent"
          >
            <PenLine className="size-4" /> Transcribe Manually
          </button>
          <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-secondary text-sm font-medium transition-colors hover:bg-accent">
            <Upload className="size-4" /> Upload Subtitles File
          </button>
        </div>
      </div>
    </div>
  );
}

// Manual transcription — pick source + language, then add empty subtitles.
function ManualSubtitles({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-1">
        <button type="button" onClick={onBack} className="grid size-6 shrink-0 place-items-center rounded hover:bg-accent" title="Back">
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="text-base font-semibold">Subtitles</h2>
      </div>
      <div className="mx-auto flex max-w-[25rem] flex-col gap-6 px-3 py-6">
        <Field label="What do you want to transcribe?">
          <Dropdown value="Don't attach subtitles to a specific video" />
        </Field>
        <Field label="What language is being spoken?">
          <Dropdown value="English" badge="US" sub="English (US)" />
        </Field>
        <button
          type="button"
          className="flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          Add Subtitles
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{label}</p>
      {children}
    </div>
  );
}

function Dropdown({ value, right, badge, sub }: { value: string; right?: string; badge?: string; sub?: string }) {
  return (
    <button type="button" className="flex h-10 w-full items-center gap-2 rounded-lg bg-secondary/60 px-3 text-sm transition-colors hover:bg-accent">
      {badge ? <span className="grid h-[22px] w-8 place-items-center rounded-sm bg-secondary text-xs font-semibold">{badge}</span> : null}
      <span className="min-w-0 flex-1 truncate text-left font-medium">{value}</span>
      {sub ? <span className="shrink-0 text-[11px] text-muted-foreground">{sub}</span> : null}
      {right ? <span className="shrink-0 text-muted-foreground">{right}</span> : null}
      <ChevronDown className="size-4 shrink-0 opacity-50" />
    </button>
  );
}

function ToggleRow({ label, checked, onChange, upgrade, info }: { label: string; checked: boolean; onChange: (v: boolean) => void; upgrade?: boolean; info?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {upgrade ? (
          <span className="grid size-4 place-items-center rounded bg-gradient-to-br from-amber-300 to-amber-500 text-black" title="Upgrade">
            <Gem className="size-2.5 fill-current" />
          </span>
        ) : null}
        <span className="text-sm font-semibold">{label}</span>
        {info ? <Info className="size-4 text-muted-foreground/50" /> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={cn("flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors", checked ? "bg-[#14b8a6]" : "bg-border")}
      >
        <span className={cn("size-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
      </button>
    </div>
  );
}
