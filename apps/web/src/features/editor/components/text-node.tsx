import type { NodeProps } from "@xyflow/react";
import { Eye, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useEditorActions } from "../editor-actions";
import { useNodeActions } from "../hooks/use-node-actions";
import { Markdown } from "./markdown";
import { NodeShell } from "./node-shell";
import { RecommendedActions } from "./recommended-actions";

export function TextNode({ id, data, selected }: NodeProps) {
  const { locked, mode, text } = data as { locked?: boolean; mode?: "text"; text?: string };
  const { setNodeData } = useEditorActions();
  const runAction = useNodeActions(id);
  const isTextMode = mode === "text";
  const hasText = Boolean(text?.trim());
  // Rendered Markdown by default; drop into a textarea to edit. Empty → edit.
  const [editing, setEditing] = useState(false);
  const showEditor = editing || !hasText;

  return (
    <NodeShell
      id={id}
      kind="text"
      selected={Boolean(selected)}
      locked={Boolean(locked)}
      data={data}
      showPromptBar={!isTextMode}
    >
      {isTextMode ? (
        <div className="relative">
          <div className="nodrag absolute right-0 top-0 z-10 flex items-center gap-0.5">
            {hasText ? (
              <button
                type="button"
                aria-label={showEditor ? "Preview" : "Edit"}
                onClick={() => setEditing((v) => !v)}
                className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {showEditor ? <Eye className="size-4" /> : <Pencil className="size-4" />}
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Clear text"
              onClick={() => {
                setNodeData(id, { mode: undefined, text: "" });
                setEditing(false);
              }}
              className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {showEditor ? (
            <textarea
              value={text ?? ""}
              onChange={(e) => setNodeData(id, { text: e.target.value })}
              placeholder="Write your text… (Markdown supported)"
              className="nodrag nowheel min-h-44 max-h-[320px] w-full resize-none overflow-y-auto bg-transparent pr-14 text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground"
            />
          ) : (
            <div className="nodrag nowheel min-h-44 max-h-[320px] overflow-y-auto pr-7 [scrollbar-width:thin]">
              <Markdown>{text ?? ""}</Markdown>
            </div>
          )}
        </div>
      ) : (
        <RecommendedActions kind="text" onAction={runAction} />
      )}
    </NodeShell>
  );
}
