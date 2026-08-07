"use client";

import { ChevronLeft, ChevronsUpDown, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useGeneration } from "../../hooks/use-generation";

const ACCENT = "#14b8a6";

// Actor label -> a generic voice hint passed to the TTS model.
const ACTORS = [
  { label: "Bob - Deep and Insightful", sub: "male", voice: "onyx" },
  { label: "Anna - Warm and Clear", sub: "female", voice: "nova" },
  { label: "Leo - Bright and Friendly", sub: "male", voice: "echo" },
  { label: "Mia - Calm and Gentle", sub: "female", voice: "shimmer" },
];

// Text-to-Speech composer. Runs through the shared generation pipeline (audio
// kind); the resulting clip lands in the Media pool to drag onto the timeline.
export function AddTts({ onBack, projectId }: { onBack: () => void; projectId: string }) {
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"actors" | "clone">("actors");
  const [actor, setActor] = useState(0);
  const gen = useGeneration(projectId);

  useEffect(() => {
    if (gen.status === "done") {
      gen.reset();
      onBack();
    }
  }, [gen.status, gen.reset, onBack]);

  const generate = () => {
    if (!text.trim() || gen.running) return;
    gen.run({ kind: "audio", prompt: text.trim(), params: { voice: ACTORS[actor].voice } });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col select-none">
      <div className="flex items-center gap-2 px-3 py-3">
        <button type="button" onClick={onBack} className="grid size-6 shrink-0 place-items-center rounded hover:bg-accent" title="Back">
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="text-base font-semibold">Add Text-to-Speech</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3 [scrollbar-width:thin]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Your text…"
          className="w-full resize-none rounded-xl border border-border bg-secondary/40 p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#14b8a6]"
        />

        <div>
          <p className="mb-2 text-sm font-semibold">Language</p>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm transition-colors hover:bg-accent">
            <span className="grid h-5 place-items-center rounded bg-[#14b8a6] px-1.5 text-[10px] font-bold text-white">US</span>
            English
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </button>
        </div>

        <div className="flex gap-1 rounded-lg bg-secondary p-0.5 text-sm font-medium">
          {(["actors", "clone"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn("flex-1 rounded-md py-2 transition-colors", tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {t === "actors" ? "Actors" : "Voice Clone"}
            </button>
          ))}
        </div>

        {tab === "actors" ? (
          <label className="relative flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm transition-colors hover:bg-accent">
            <span className="truncate">
              {ACTORS[actor].label} <span className="text-muted-foreground">({ACTORS[actor].sub})</span>
            </span>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
            <select value={actor} onChange={(e) => setActor(Number(e.target.value))} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Voice actor">
              {ACTORS.map((a, i) => (
                <option key={a.label} value={i}>
                  {a.label} ({a.sub})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">Clone your voice — coming soon.</p>
        )}

        {gen.error ? <p className="text-sm text-red-400">{gen.error}</p> : null}
      </div>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={generate}
          disabled={gen.running || !text.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          {gen.running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {gen.running ? "Generating…" : "Generate voice"}
        </button>
      </div>
    </div>
  );
}
