import type { NodeProps } from "@xyflow/react";
import { ImageUp, Upload } from "lucide-react";
import { useRef } from "react";
import { uploadAsset } from "@/features/projects";
import { useCanvasActions } from "../canvas-actions";
import { useNodeOutput, useSetNodeOutput } from "../execution-status";
import { useNodeActions } from "../../hooks/use-node-actions";
import { AssetPreview } from "../shared/asset-preview";
import { NodeShell } from "./node-shell";
import { RecommendedActions } from "./recommended-actions";

export function ImageNode({ id, data, selected }: NodeProps) {
  const { locked, uploader } = data as { locked?: boolean; uploader?: boolean };
  const runAction = useNodeActions(id);
  const output = useNodeOutput(id);
  const setOutput = useSetNodeOutput();
  const { setNodeData } = useCanvasActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadAsset(file);
      setOutput(id, res.url);
      setNodeData(id, { src: res.url });
    } catch {
      // handled globally or via toast
    }
  };

  if (uploader && !output) {
    return (
      <NodeShell id={id} kind="image" selected={Boolean(selected)} locked={Boolean(locked)} data={data}>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/40 text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-accent hover:text-foreground"
        >
          <Upload className="size-6" />
          <span className="text-xs font-medium">Upload Image</span>
        </button>
      </NodeShell>
    );
  }

  return (
    <NodeShell
      id={id}
      kind="image"
      selected={Boolean(selected)}
      locked={Boolean(locked)}
      data={data}
      content={output ?? undefined}
    >
      {output ? (
        <AssetPreview kind="image" url={output} />
      ) : (
        <RecommendedActions kind="image" onAction={runAction} />
      )}
    </NodeShell>
  );
}
