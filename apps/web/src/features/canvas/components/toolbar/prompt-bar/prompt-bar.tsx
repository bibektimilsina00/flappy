"use client";

import { ArrowUp, Paperclip, Plus, SlidersHorizontal, X } from "lucide-react";
import { ModelSelector, ParamPanel, paramSummary } from "@/features/models";
import { useCanvasActions } from "../../canvas-actions";
import { popupRegistry } from "../../../lib/popup-registry";
import { usePromptBar } from "./hooks/use-prompt-bar";

interface PromptBarProps {
  nodeId: string;
  kind: string;
  model?: string;
  params?: Record<string, unknown>;
  prompt?: string;
}

const SUGGESTED: Record<string, string[]> = {
  image: [
    "Cyberpunk neon street rainy night 8k",
    "Studio character portrait soft lighting",
    "Watercolor landscape misty mountain",
  ],
  video: [
    "Slow pan cinematic camera motion",
    "Time lapse sunset over skyline",
    "Drone shot ocean waves crash cliff",
  ],
  audio: [
    "Upbeat synthwave driving beat 120bpm",
    "Calm piano ambient background track",
    "Dramatic cinematic orchestral swell",
  ],
};

export function PromptBar({ nodeId, kind, model, params = {}, prompt: initialPrompt = "" }: PromptBarProps) {
  const { setNodeData } = useCanvasActions();
  const {
    models,
    prompt,
    setPrompt,
    paramOpen,
    setParamOpen,
    upstreamInputs,
    upstreamImages,
  } = usePromptBar(nodeId, kind, initialPrompt);

  const activeModel = models.find((m) => m.id === model) ?? models[0];

  const handleRun = () => {
    if (!prompt.trim()) return;
    setNodeData(nodeId, { status: "running" });
  };

  const suggestions = SUGGESTED[kind] ?? [];

  return (
    <div className="flex flex-col gap-2 border-t border-border/60 bg-muted/20 p-2.5">
      {/* Upstream context pills */}
      {upstreamInputs.length || upstreamImages.length ? (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          {upstreamInputs.map((inp) => (
            <span
              key={inp.edgeId}
              className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              <Paperclip className="size-3" />
              <span className="max-w-[100px] truncate">{inp.text}</span>
            </span>
          ))}
          {upstreamImages.map((img) => (
            <span
              key={img.edgeId}
              className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5 pr-1.5 text-[10px] text-muted-foreground"
            >
              <img src={img.url} alt="" className="size-4 rounded object-cover" />
              <span>Image input</span>
            </span>
          ))}
        </div>
      ) : null}

      {/* Suggested prompts */}
      {!prompt && suggestions.length ? (
        <div className="flex flex-wrap gap-1 px-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              className="rounded-md border border-border/60 bg-card/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-foreground/30 hover:bg-accent hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}

      {/* Main prompt input */}
      <div className="relative flex items-center rounded-xl border border-border bg-card shadow-inner focus-within:border-foreground/40">
        <textarea
          rows={1}
          value={prompt}
          placeholder={`Describe ${kind} generation...`}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleRun();
            }
          }}
          className="w-full resize-none bg-transparent px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/60"
        />

        <button
          type="button"
          disabled={!prompt.trim()}
          onClick={handleRun}
          className="mr-1.5 grid size-7 place-items-center rounded-lg bg-teal-400 text-black transition-transform hover:scale-105 disabled:opacity-40"
        >
          <ArrowUp className="size-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Model & Param Selector bar */}
      <div className="flex items-center justify-between px-1 text-xs">
        {activeModel ? (
          <ModelSelector
            models={models}
            value={activeModel.id}
            onChange={(m) => setNodeData(nodeId, { model: m })}
          />
        ) : <div />}

        <button
          type="button"
          onClick={() => setParamOpen((p) => !p)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <SlidersHorizontal className="size-3" />
          <span className="text-[10px]">{paramSummary(activeModel?.params ?? [], params)}</span>
        </button>

        {paramOpen && activeModel ? (
          <ParamPanel
            params={activeModel.params}
            values={params}
            onChange={(key, value) => setNodeData(nodeId, { params: { ...params, [key]: value } })}
          />
        ) : null}
      </div>
    </div>
  );
}
