"use client";

import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { useModels } from "@/features/models";
import { useGeneration } from "../../hooks/use-generation";
import { GenStatus } from "./ai-panel";

const ACCENT = "#14b8a6";
const ASSIST_SUGGESTIONS = [
  "A high-tech cyberpunk city at night with neon rain",
  "Close-up of a cup of steaming hot black coffee",
  "A fluffy white dog running through a field of sunflowers",
  "Cinematic drone shot over mist-covered pine mountains",
];

export function AssistantPanel({
  prompt,
  setPrompt,
  gen,
  gotoTab,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  gen: ReturnType<typeof useGeneration>;
  gotoTab: (t: string) => void;
}) {
  const imageModels = useModels("image").data ?? [];
  const videoModels = useModels("video").data ?? [];
  const isVideo = /\b(video|animat\w*|motion|clip|footage|cinematic|moving|fly\w*|drone|walk\w*|run\w*|danc\w*|zoom|pan|slow[- ]?mo)\b/i.test(prompt);
  const kind: "image" | "video" = isVideo ? "video" : "image";
  const models = kind === "video" ? videoModels : imageModels;
  const model = models.find((m) => m.free !== false && m.default) ?? models.find((m) => m.free !== false) ?? models[0];
  const canGo = prompt.trim().length > 0 && !!model && !gen.running;
  const submit = () => {
    if (canGo && model) gen.run({ kind, prompt, model: model.id, params: {} });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* scrollable content */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          <Sparkles className="size-6" style={{ color: ACCENT }} />
          <p className="text-sm text-muted-foreground">Describe what you want — I'll pick the mode and a model, and generate it.</p>
        </div>
        <div className="flex flex-col gap-2">
          {ASSIST_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              className="rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground/90 transition-colors hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>
        <GenStatus gen={gen} />
      </div>

      {/* input pinned to the bottom (canvas assistant style) */}
      <div className="shrink-0 p-3">
        {prompt.trim() ? (
          <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>
              Detected <span className="capitalize text-foreground">{kind}</span>
              {model ? <> · {model.name}</> : null}
            </span>
            <button type="button" onClick={() => gotoTab(kind === "video" ? "Video" : "Image")} className="hover:underline" style={{ color: ACCENT }}>
              Edit in {kind === "video" ? "Video" : "Image"}
            </button>
          </div>
        ) : null}
        <div className="rounded-lg border border-border bg-background p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Describe what to generate…"
            className="max-h-32 w-full resize-none bg-transparent text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={!canGo}
              aria-label="Generate"
              className="flex size-7 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              {gen.running ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
