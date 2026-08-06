import type { NodeProps } from "@xyflow/react";
import { Eye, Pencil, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useCanvasActions } from "../canvas-actions";
import { useNodeActions } from "../../hooks/use-node-actions";
import { applyMarkdown, type FormatOp } from "../../lib/format-markdown";
import { TextFormatContext } from "../../lib/text-format-context";
import { Markdown } from "../shared/markdown";
import { NodeShell } from "./node-shell";
import { RecommendedActions } from "./recommended-actions";

function viewSelectionRange(el: HTMLElement | null, source: string): { start: number; end: number } | null {
  if (!el) return null;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.commonAncestorContainer)) return null;
  const text = range.toString().trim();
  if (!text) return null;
  const idx = source.indexOf(text);
  if (idx < 0) return null;
  return { start: idx, end: idx + text.length };
}

export function TextNode({ id, data, selected }: NodeProps) {
  const mode = (data as { mode?: "text" | "prompt" })?.mode ?? "prompt";
  const text = String((data as { text?: string })?.text ?? "");
  const locked = Boolean((data as { locked?: boolean })?.locked);

  const { setNodeData } = useCanvasActions();
  const runAction = useNodeActions(id);

  const [preview, setPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  const formatText = useCallback(
    (op: FormatOp) => {
      if (!preview && textareaRef.current) {
        const ta = textareaRef.current;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const res = applyMarkdown(text, start, end, op);
        setNodeData(id, { text: res.text });
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(res.start, res.end);
        });
        return;
      }

      if (preview) {
        const range = viewSelectionRange(viewRef.current, text);
        if (!range) return;
        const res = applyMarkdown(text, range.start, range.end, op);
        setNodeData(id, { text: res.text });
      }
    },
    [id, preview, text, setNodeData],
  );

  if (mode === "prompt") {
    return (
      <NodeShell id={id} kind="text" selected={Boolean(selected)} locked={locked} data={data}>
        <RecommendedActions kind="text" onAction={runAction} />
      </NodeShell>
    );
  }

  return (
    <TextFormatContext.Provider value={formatText}>
      <NodeShell
        id={id}
        kind="text"
        selected={Boolean(selected)}
        locked={locked}
        data={data}
        showPromptBar={false}
        content={text || undefined}
      >
        <div className="group/text relative flex min-h-[160px] flex-col p-3">
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="absolute top-2 right-2 z-10 rounded-md bg-secondary/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover/text:opacity-100"
          >
            {preview ? <Pencil className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>

          {preview ? (
            <div ref={viewRef} className="h-full w-full min-h-[140px] select-text overflow-y-auto">
              <Markdown content={text || "*Empty text node*"} />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              placeholder="Write anything in markdown..."
              onChange={(e) => setNodeData(id, { text: e.target.value })}
              className="h-full w-full min-h-[140px] resize-none bg-transparent font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          )}
        </div>
      </NodeShell>
    </TextFormatContext.Provider>
  );
}
