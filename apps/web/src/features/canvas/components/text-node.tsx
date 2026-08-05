import type { NodeProps } from "@xyflow/react";
import { Eye, Pencil, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useCanvasActions } from "./canvas-actions";
import { useNodeActions } from "../hooks/use-node-actions";
import { applyMarkdown, type FormatOp } from "../lib/format-markdown";
import { TextFormatContext } from "../lib/text-format-context";
import { Markdown } from "./markdown";
import { NodeShell } from "./nodes/node-shell";
import { RecommendedActions } from "./nodes/recommended-actions";

// Map a DOM selection inside the rendered view back to a source range by
// finding the selected text in the Markdown source (works for plain runs).
function viewSelectionRange(el: HTMLElement | null, source: string): { start: number; end: number } | null {
  if (!el) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.commonAncestorContainer)) return null;
  const picked = sel.toString();
  const idx = picked ? source.indexOf(picked) : -1;
  if (idx < 0) return null;
  return { start: idx, end: idx + picked.length };
}

export function TextNode({ id, data, selected }: NodeProps) {
  const { locked, mode, text } = data as { locked?: boolean; mode?: "text"; text?: string };
  const { setNodeData } = useCanvasActions();
  const runAction = useNodeActions(id);
  const isTextMode = mode === "text";
  const hasText = Boolean(text?.trim());
  const [editing, setEditing] = useState(false);
  const showEditor = editing || !hasText;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  // Toolbar formatting: act on the selection in whichever surface is active.
  const applyFormat = useCallback(
    (op: FormatOp) => {
      const source = text ?? "";
      const ta = textareaRef.current;
      let start: number;
      let end: number;
      if (ta && document.activeElement === ta) {
        start = ta.selectionStart;
        end = ta.selectionEnd;
      } else {
        const range = viewSelectionRange(viewRef.current, source);
        // No selection → append at the end.
        start = range?.start ?? source.length;
        end = range?.end ?? source.length;
      }
      const result = applyMarkdown(source, start, end, op);
      setNodeData(id, { text: result.text });
      if (ta && document.activeElement === ta) {
        requestAnimationFrame(() => {
          ta.selectionStart = result.start;
          ta.selectionEnd = result.end;
        });
      }
    },
    [text, id, setNodeData],
  );

  return (
    <TextFormatContext.Provider value={isTextMode ? applyFormat : null}>
      <NodeShell
        id={id}
        kind="text"
        selected={Boolean(selected)}
        locked={Boolean(locked)}
        data={data}
        showPromptBar={!isTextMode}
        content={isTextMode && hasText ? text : undefined}
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
                ref={textareaRef}
                value={text ?? ""}
                onChange={(e) => setNodeData(id, { text: e.target.value })}
                placeholder="Write your text… (Markdown supported)"
                className="nodrag nowheel min-h-44 max-h-[320px] w-full resize-none overflow-y-auto bg-transparent pr-14 text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground"
              />
            ) : (
              <div
                ref={viewRef}
                // nodrag only when selected: first click drags/selects the node,
                // a selected node frees the body for text selection.
                className={`${selected ? "nodrag " : ""}nowheel min-h-44 max-h-[320px] overflow-y-auto pr-7 [scrollbar-width:thin]`}
              >
                <Markdown>{text ?? ""}</Markdown>
              </div>
            )}
          </div>
        ) : (
          <RecommendedActions kind="text" onAction={runAction} />
        )}
      </NodeShell>
    </TextFormatContext.Provider>
  );
}
