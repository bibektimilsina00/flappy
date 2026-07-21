"use client";

import { ArrowUp, Paperclip, Plus, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { ModelSelector, ParamPanel, paramSummary, useModels } from "@/features/models";
import { useEditorActions } from "../editor-actions";
import { useUpstreamInputs } from "../hooks/use-upstream-inputs";
import { popupRegistry } from "../popup-registry";

interface PromptBarProps {
  nodeId: string;
  kind: string;
  model?: string;
  params?: Record<string, unknown>;
  prompt?: string;
}

export function PromptBar({ nodeId, kind, model, params, prompt }: PromptBarProps) {
  const { data: models } = useModels(kind);
  const { setNodeData, removeEdge, runNode } = useEditorActions();
  const inputs = useUpstreamInputs(nodeId);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (!panelOpen) return;
    return popupRegistry.register(() => setPanelOpen(false));
  }, [panelOpen]);

  const list = models ?? [];
  // Default a fresh node to the first row of the selector: the top free model,
  // else the first one. Keeps the header selection and the run model in sync.
  const selectedId = model ?? (list.find((m) => m.free !== false) ?? list[0])?.id ?? "";
  const selected = list.find((m) => m.id === selectedId);
  const paramValues = params ?? {};

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xl">
      <button
        aria-label="Add media"
        className="grid size-12 shrink-0 place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-accent/40"
      >
        <Plus className="size-4" />
      </button>

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

      <textarea
        value={prompt ?? ""}
        onChange={(e) => setNodeData(nodeId, { prompt: e.target.value })}
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
        className="mt-3 min-h-16 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ModelSelector
            models={list}
            value={selectedId}
            onChange={(id) => setNodeData(nodeId, { model: id })}
          />

          {selected && selected.params.length > 0 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPanelOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary/70"
              >
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                {paramSummary(selected.params, paramValues)}
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
          <button
            aria-label="Generate"
            onClick={() => runNode(nodeId)}
            className="flex size-9 items-center justify-center rounded-full bg-[#c2b558] text-black transition-opacity hover:opacity-90"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
