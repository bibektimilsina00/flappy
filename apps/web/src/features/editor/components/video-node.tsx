import type { NodeProps } from "@xyflow/react";
import { useNodeOutput } from "../execution-status";
import { useNodeActions } from "../hooks/use-node-actions";
import { AssetPreview } from "./asset-preview";
import { NodeShell } from "./node-shell";
import { RecommendedActions } from "./recommended-actions";

export function VideoNode({ id, data, selected }: NodeProps) {
  const { locked } = data as { locked?: boolean };
  const runAction = useNodeActions(id);
  const output = useNodeOutput(id);

  return (
    <NodeShell id={id} kind="video" selected={Boolean(selected)} locked={Boolean(locked)} data={data} content={output ?? undefined}>
      {output ? (
        <AssetPreview kind="video" url={output} />
      ) : (
        <RecommendedActions kind="video" onAction={runAction} />
      )}
    </NodeShell>
  );
}
