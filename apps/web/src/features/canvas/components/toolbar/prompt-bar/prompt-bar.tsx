"use client";

import { ArrowUp, Paperclip, Plus, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ModelSelector, ParamPanel, paramSummary, useModels } from "@/features/models";
import { useCanvasActions } from "../../canvas-actions";
import { useUpstreamImages, useUpstreamInputs } from "../../../hooks/use-upstream-inputs";
import { popupRegistry } from "../../../lib/popup-registry";
import { AddFromCanvas } from "./add-from-canvas";
import { MentionPicker } from "./mention-picker";

interface PromptBarProps {
  nodeId: string;
  kind: string;
  model?: string;
  params?: Record<string, unknown>;
  prompt?: string;
}

function modeLabel(kind: string, hasImage: boolean): string | null {
  if (kind === "image") return hasImage ? "Reference image to image" : "Text to image";
  if (kind === "video") return hasImage ? "Image to video" : "Text to video";
  return null;
}

export function PromptBar({ nodeId, kind, model, params, prompt }: PromptBarProps) {
  const { data: models } = useModels(kind);
  const { setNodeData, removeEdge, runNode, connectNodes } = useCanvasActions();
  const inputs = useUpstreamInputs(nodeId);
  const images = useUpstreamImages(nodeId);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!panelOpen) return;
    return popupRegistry.register(() => setPanelOpen(false));
  }, [panelOpen]);

  useEffect(() => {
    if (!addOpen) return;
    return popupRegistry.register(() => setAddOpen(false));
  }, [addOpen]);

  useEffect(() => {
    if (!mentionOpen) return;
    return popupRegistry.register(() => setMentionOpen(false));
  }, [mentionOpen]);

  const list = models ?? [];
  // Default a fresh node to the first row of the selector: the top free model,
  // else the first one. Keeps the header selection and the run model in sync.
  const selectedId = model ?? (list.find((m) => m.free !== false) ?? list[0])?.id ?? "";
  const selected = list.find((m) => m.id === selectedId);
  const paramValues = params ?? {};
  const mode = modeLabel(kind, images.length > 0);
  // Something to generate from → surface the credit cost on the run button.
  const hasContent = Boolean(prompt?.trim()) || images.length > 0 || inputs.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xl">
      <div className="flex items-center gap-2">
        {/* Connected image references (same size as the + box) */}
        {images.map((img) => (
          <div key={img.edgeId} className="group/ref relative size-12 shrink-0">
            {/* biome-ignore lint/a11y/useAltText: reference thumbnail */}
            <img src={img.url} className="size-12 rounded-lg border border-border object-cover" />
            <button
              type="button"
              aria-label="Remove image reference"
              onClick={() => removeEdge(img.edgeId)}
              className="absolute -right-1.5 -top-1.5 hidden size-4 place-items-center rounded-full bg-black text-white shadow group-hover/ref:grid"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        <div className="relative">
          <button
            type="button"
            aria-label="Add media"
            onClick={() => setAddOpen((v) => !v)}
            className="grid size-12 shrink-0 place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-accent/40"
          >
            <Plus className="size-4" />
          </button>
          {addOpen ? (
            <div data-popup className="absolute bottom-full left-0 z-[100] mb-2">
              <AddFromCanvas nodeId={nodeId} onClose={() => setAddOpen(false)} />
            </div>
          ) : null}
        </div>
      </div>

      {inputs.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {inputs.map((input) => (
            <span
              key={input.edgeId}
              className="relative flex items-center rounded-md bg-[#2a2a2a] py-1.5 pl-4 pr-3 text-sm text-foreground"
            >
              <span className="absolute bottom-1.5 left-1.5 top-1.5 w-[3px] rounded-full bg-teal-400" />
              <span className="line-clamp-1 max-w-[280px]">{input.text}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        {mentionOpen ? (
          <MentionPicker
            nodeId={nodeId}
            kind={kind}
            onPick={(sourceId, handle) => {
              connectNodes(sourceId, null, nodeId, handle);
              // drop the "@" that triggered the picker
              setNodeData(nodeId, { prompt: (prompt ?? "").replace(/@(?=[^@]*$)/, "") });
              setMentionOpen(false);
            }}
          />
        ) : null}
        <p className="mt-3 text-sm text-muted-foreground">Use @ to reference resources in your prompt</p>
        <textarea
          value={prompt ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setNodeData(nodeId, { prompt: val });
            const caret = e.target.selectionStart ?? val.length;
            setMentionOpen(val[caret - 1] === "@");
          }}
          onKeyDown={(e) => {
          // Backspace at the very start removes the last connected-input chip.
          if (
            e.key === "Backspace" &&
            e.currentTarget.selectionStart === 0 &&
            e.currentTarget.selectionEnd === 0 &&
            inputs.length > 0
          ) {
            e.preventDefault();
            removeEdge(inputs[inputs.length - 1].edgeId);
          }
        }}
          placeholder="Enter prompt"
          className="mt-1 min-h-16 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ModelSelector
            models={list}
            value={selectedId}
            // Params are model-specific (voices, ratios…) — reset on switch so a
            // stale value from the old model is never shown or sent.
            onChange={(id) => setNodeData(nodeId, { model: id, params: {} })}
          />

          {selected && (selected.params.length > 0 || mode) ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPanelOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary/70"
              >
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                <span className="truncate">
                  {[mode, paramSummary(selected.params, paramValues)].filter(Boolean).join(" / ")}
                </span>
              </button>

              {panelOpen ? (
                <div data-popup className="absolute bottom-full left-0 z-[100] mb-2">
                  <ParamPanel
                    params={selected.params}
                    values={paramValues}
                    onChange={(key, value) =>
                      setNodeData(nodeId, { params: { ...paramValues, [key]: value } })
                    }
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Attach"
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="size-4" />
          </button>
          {hasContent && selected ? (
            // Once there's something to run, show what it costs right on the button.
            <button
              type="button"
              aria-label={`Generate · ${selected.cost} credits`}
              onClick={() => runNode(nodeId)}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#fde68a] to-[#f5c518] py-2 pr-2.5 pl-3.5 text-sm font-bold text-black shadow-lg shadow-yellow-500/20 transition-opacity hover:opacity-90"
            >
              <span className="tabular-nums">{selected.cost}</span>
              <ArrowUp className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Generate"
              onClick={() => runNode(nodeId)}
              className="flex size-9 items-center justify-center rounded-full bg-[#14b8a6] text-white transition-opacity hover:opacity-90"
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
