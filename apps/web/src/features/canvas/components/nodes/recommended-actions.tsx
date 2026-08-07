import { cn } from "@/lib/cn";
import { NODE_CONFIG, type NodeAction, type NodeKind } from "../../lib/constants";

interface RecommendedActionsProps {
  kind: NodeKind;
  onAction: (action: NodeAction) => void;
  previewClassName?: string;
}

// Default node body: type icon (preview area) + recommended-action chips.
export function RecommendedActions({
  kind,
  onAction,
  previewClassName = "h-28",
}: RecommendedActionsProps) {
  const config = NODE_CONFIG[kind];
  const Icon = config.icon;

  return (
    <div className="flex flex-col px-2.5 pb-2.5">
      <div className={cn("grid place-items-center", previewClassName)}>
        <Icon className="size-8 text-muted-foreground/40" />
      </div>

      <p className="mb-2 mt-3 text-xs text-muted-foreground">Recommended Action</p>
      <div className="flex flex-col items-start gap-2">
        {config.actions.map((action) => {
          const ActionIcon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              // Don't let the click bubble to React Flow (which would select the node).
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onAction(action)}
              className="nodrag flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
            >
              <ActionIcon className="size-4 text-muted-foreground" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
