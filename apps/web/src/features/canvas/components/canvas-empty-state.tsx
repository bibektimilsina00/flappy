import { CREATE_NODE_KINDS, NODE_CONFIG, type NodeKind } from "../lib/constants";
import { QuickStartButton } from "./quick-start-button";

export function CanvasEmptyState({ onAddNode }: { onAddNode: (kind: NodeKind) => void }) {
  return (
    <div className="pointer-events-none flex h-full flex-col items-center justify-center px-6">
      <p className="mb-6 text-center text-base text-muted-foreground">
        Quick-start below, or right-click anywhere to add a node
      </p>
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3">
        {CREATE_NODE_KINDS.map((kind) => (
          <QuickStartButton
            key={kind}
            icon={NODE_CONFIG[kind].icon}
            label={NODE_CONFIG[kind].title}
            onClick={() => onAddNode(kind)}
          />
        ))}
      </div>
    </div>
  );
}
