import type { NodeProps } from "@xyflow/react";
import { useModels } from "@/features/models";
import type { NodeAction } from "../lib/constants";
import { useCanvasActions } from "./canvas-actions";
import { useNodeOutput } from "./execution-status";
import { AssetPreview } from "./asset-preview";
import { NodeShell } from "./node-shell";
import { RecommendedActions } from "./recommended-actions";

export function AudioNode({ id, data, selected }: NodeProps) {
  const { locked } = data as { locked?: boolean };
  const output = useNodeOutput(id);
  const { setNodeData } = useCanvasActions();
  const { data: models } = useModels("audio");

  // Audio actions pick the generation mode by selecting a speech / music model.
  const runAction = (action: NodeAction) => {
    const mode = action.action === "music-generation" ? "music" : "speech";
    const model = (models ?? []).find((m) => m.mode === mode);
    if (model) setNodeData(id, { model: model.id });
  };

  return (
    <NodeShell
      id={id}
      kind="audio"
      selected={Boolean(selected)}
      locked={Boolean(locked)}
      data={data}
      content={output ?? undefined}
    >
      {output ? (
        <AssetPreview kind="audio" url={output} />
      ) : (
        <RecommendedActions kind="audio" onAction={runAction} />
      )}
    </NodeShell>
  );
}
