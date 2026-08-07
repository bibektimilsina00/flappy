"use client";

import { useNodes, useStore } from "@xyflow/react";
import { Check, ImageUp, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { uploadAsset } from "@/features/projects";
import { cn } from "@/lib/cn";
import { useCanvasActions } from "../../canvas-actions";
import { useOutputs } from "../../execution-status";

// Popover that hangs off the prompt bar's "+" — pick image nodes already on the
// canvas to wire in as references, or upload a new one.
export function AddFromCanvas({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const nodes = useNodes();
  const outputs = useOutputs();
  const { connectNodes, addInputNode } = useCanvasActions();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sources already feeding this node — don't offer them again.
  const connected = useStore((s) =>
    new Set(s.edges.filter((e) => e.target === nodeId).map((e) => e.source)),
  );

  const items = nodes
    .filter((n) => n.id !== nodeId && n.type === "image" && !connected.has(n.id))
    .map((n) => ({ id: n.id, url: outputs[n.id] ?? (n.data as { src?: string })?.src }))
    .filter((x): x is { id: string; url: string } => Boolean(x.url));

  const toggle = (id: string) =>
    setSel((p) => {
      const next = new Set(p);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const add = () => {
    for (const id of sel) connectNodes(id, null, nodeId, "image");
    onClose();
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadAsset(file);
      addInputNode(nodeId, "image", "image", { src: res.url });
      onClose();
    } catch {
      // handled globally
    } finally {
      setUploading(false);
    }
  };

  return (
    <div data-popup className="w-[560px] max-w-[80vw] rounded-xl border border-border bg-card p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Add from canvas</h3>
        <span className="text-sm text-muted-foreground">{sel.size} selected</span>
      </div>

      {items.length > 0 ? (
        <div className="mt-3 grid max-h-64 grid-cols-4 gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((it) => {
            const on = sel.has(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => toggle(it.id)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg border-2 transition-colors",
                  on ? "border-teal-400" : "border-transparent hover:border-white/20",
                )}
              >
                {/* biome-ignore lint/a11y/useAltText: canvas thumbnail */}
                <img src={it.url} className="size-full object-cover" alt="" />
                <span
                  className={cn(
                    "absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-md border",
                    on ? "border-teal-400 bg-teal-400 text-black" : "border-white/60 bg-black/30 text-transparent",
                  )}
                >
                  <Check className="size-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 grid place-items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
          <ImageUp className="size-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No images on the canvas yet — upload one below.</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" />
        <button
          type="button"
          aria-label="Upload an image"
          title="Upload an image"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="grid size-10 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        </button>
        <button
          type="button"
          onClick={add}
          disabled={sel.size === 0}
          className="flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="size-4" /> Add ({sel.size})
        </button>
      </div>
    </div>
  );
}
