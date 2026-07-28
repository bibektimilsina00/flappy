import type { NodeProps } from "@xyflow/react";
import { ImageUp, Upload } from "lucide-react";
import { useRef } from "react";
import { uploadAsset } from "@/features/projects";
import { useCanvasActions } from "../canvas-actions";
import { useNodeOutput, useSetNodeOutput } from "../execution-status";
import { useNodeActions } from "../hooks/use-node-actions";
import { AssetPreview } from "./asset-preview";
import { NodeShell } from "./node-shell";
import { RecommendedActions } from "./recommended-actions";

export function ImageNode({ id, data, selected }: NodeProps) {
  const { locked, uploader } = data as { locked?: boolean; uploader?: boolean };
  const runAction = useNodeActions(id);
  const output = useNodeOutput(id);
  const { setNodeData } = useCanvasActions();
  const setOutput = useSetNodeOutput();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { key, url, name } = await uploadAsset(file);
      setNodeData(id, { upload_key: key, upload_name: name });
      setOutput(id, url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <NodeShell
      id={id}
      kind="image"
      selected={Boolean(selected)}
      locked={Boolean(locked)}
      data={data}
      content={output ?? undefined}
      flush={Boolean(output)}
    >
      {output ? (
        <AssetPreview kind="image" url={output} />
      ) : uploader ? (
        <div className="grid min-h-[220px] place-items-center gap-6">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <ImageUp className="size-9 text-muted-foreground/40" strokeWidth={1.5} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary/80"
          >
            <Upload className="size-4" />
            Upload
          </button>
        </div>
      ) : (
        <RecommendedActions kind="image" onAction={runAction} />
      )}
    </NodeShell>
  );
}
