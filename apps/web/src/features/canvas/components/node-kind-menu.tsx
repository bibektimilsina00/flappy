import { CREATE_NODE_KINDS, NODE_CONFIG, type NodeKind } from "../constants";

export function NodeKindMenu({ onSelect }: { onSelect: (kind: NodeKind) => void }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-xl">
      {CREATE_NODE_KINDS.map((kind) => {
        const Icon = NODE_CONFIG[kind].icon;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onSelect(kind)}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Icon className="size-3.5" />
            {NODE_CONFIG[kind].title}
          </button>
        );
      })}
    </div>
  );
}
