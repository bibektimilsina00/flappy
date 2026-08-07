"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { type Voice, VoicePicker } from "./voice-picker";

const ACCENT = "#14b8a6";

// Voice ids map to the TTS model's supported voices; the label/tags are display.
const VOICES: Voice[] = [
  { id: "nova", name: "Hope", tags: ["female", "conversational", "confident"] },
  { id: "shimmer", name: "Mia", tags: ["female", "calm", "gentle"] },
  { id: "coral", name: "Aria", tags: ["female", "warm", "narrative"] },
  { id: "sage", name: "June", tags: ["female", "soft", "friendly"] },
  { id: "fable", name: "Ivy", tags: ["female", "expressive", "storytelling"] },
  { id: "onyx", name: "Bob", tags: ["male", "deep", "classy"] },
  { id: "echo", name: "Leo", tags: ["male", "bright", "casual"] },
  { id: "ash", name: "Miles", tags: ["male", "smooth", "social media"] },
  { id: "verse", name: "Andrew", tags: ["male", "energetic", "upbeat"] },
  { id: "alloy", name: "Sam", tags: ["neutral", "balanced", "clear"] },
];

// "Add character" composer — write a script for the selected character and generate
// a talking-head video. Replaces the old prompt() flow.
export function AddCharacter({
  name,
  imageUrl,
  onGenerate,
  onBack,
  onPickAnother,
}: {
  name: string;
  imageUrl: string;
  onGenerate: (script: string, voice: string) => Promise<void>;
  onBack: () => void;
  onPickAnother: () => void;
}) {
  const [script, setScript] = useState("");
  const [voice, setVoice] = useState<string>(VOICES[0].id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    if (!script.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onGenerate(script.trim(), voice);
      onBack();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't generate the character");
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
        <h2 className="text-base font-semibold">Add character</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3 [scrollbar-width:thin]">
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={5}
          placeholder="What do you want your character to say?"
          className="w-full resize-none rounded-xl border border-border bg-secondary/40 p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#14b8a6]"
        />

        <div>
          <p className="mb-2 text-sm font-semibold">Character</p>
          <button
            type="button"
            onClick={onPickAnother}
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm transition-colors hover:bg-accent"
          >
            {/* biome-ignore lint/performance/noImgElement: external portrait thumbnail */}
            <img src={imageUrl} alt={name} className="size-8 shrink-0 rounded-full object-cover object-top" />
            <span className="min-w-0 flex-1 truncate text-left font-medium">{name}</span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Language</p>
          <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm">
            <span className="grid h-[22px] w-8 place-items-center rounded-sm bg-secondary text-xs font-semibold">US</span>
            <span className="min-w-0 flex-1 truncate text-left font-medium">English</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">English (US)</span>
            <ChevronDown className="size-4 shrink-0 opacity-40" />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Voice</p>
          <VoicePicker voices={VOICES} value={voice} onChange={setVoice} />
        </div>

        <button
          type="button"
          onClick={run}
          disabled={!script.trim() || busy}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {busy ? "Generating…" : "Generate"}
        </button>
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
      </div>
    </div>
  );
}
