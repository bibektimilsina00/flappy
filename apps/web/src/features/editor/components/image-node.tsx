import type { NodeProps } from "@xyflow/react";
import { useNodeOutput } from "../execution-status";
import { useNodeActions } from "../hooks/use-node-actions";
import { AssetPreview } from "./asset-preview";
import { NodeShell } from "./node-shell";
import { RecommendedActions } from "./recommended-actions";

export function ImageNode({ id, data, selected }: NodeProps) {
  const { locked } = data as { locked?: boolean };
  const runAction = useNodeActions(id);
  const output = useNodeOutput(id);

  return (
    <NodeShell id={id} kind="image" selected={Boolean(selected)} locked={Boolean(locked)} data={data}>
      {output ? (
        <AssetPreview kind="image" url={output} />
      ) : (
        <RecommendedActions kind="image" onAction={runAction} />
      )}
    </NodeShell>
  );
}
