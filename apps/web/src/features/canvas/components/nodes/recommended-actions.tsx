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
  const cfg = NODE_CONFIG[kind];
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col p-2.5">
      <div
        className={cn(
          "grid w-full place-items-center rounded-lg border border-border bg-card/60 text-muted-foreground/50 transition-colors group-hover:border-foreground/20 group-hover:text-muted-foreground",
          previewClassName,
        )}
      >
        <Icon className="size-8 stroke-[1.5]" />
      </div>

      {cfg.actions.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {cfg.actions.map((act) => {
            const ActIcon = act.icon;
            return (
              <button
                key={act.label}
                type="button"
                onClick={() => onAction(act)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent hover:text-foreground active:scale-95"
              >
                <ActIcon className="size-3 shrink-0" />
                {act.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
