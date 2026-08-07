"use client";

import { useNodes } from "@xyflow/react";
import { ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { NODE_CONFIG, type NodeKind, resolveTargetHandle } from "../../../lib/constants";

interface MentionPickerProps {
  nodeId: string;
  kind: string;
  onPick: (sourceId: string, targetHandle: string) => void;
}

function resourceName(data: Record<string, unknown>, kind: NodeKind): string {
  const raw = String(data.text ?? data.prompt ?? data.label ?? "").trim();
  return raw ? (raw.split("\n")[0] as string) : NODE_CONFIG[kind].title;
}

// The "@" resource picker. Only "Related resources" (nodes that can feed this one)
// shows on open; "All resources" flies out to the right when the panel is hovered.
export function MentionPicker({ nodeId, kind, onPick }: MentionPickerProps) {
  const nodes = useNodes();
  const [showAll, setShowAll] = useState(false);
  // A short close delay keeps the flyout stable while the cursor crosses the gap.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setShowAll(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setShowAll(false), 160);
  };

  const items = nodes
    .filter((n) => n.id !== nodeId && n.type && n.type in NODE_CONFIG && n.type !== "sticker")
    .map((n) => ({
      node: n,
      handle: resolveTargetHandle(n.type as NodeKind, kind as NodeKind),
    }));

  const related = items.filter((x) => x.handle);

  const Row = ({ node, handle }: (typeof items)[number]) => {
    const k = node.type as NodeKind;
    const Icon = NODE_CONFIG[k].icon;
    return (
      <button
        type="button"
        disabled={!handle}
        // onMouseDown (not onClick) so the textarea doesn't blur-close us first.
        onMouseDown={(e) => {
          e.preventDefault();
          if (handle) onPick(node.id, handle);
        }}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{resourceName(node.data, k)}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon className="size-3" /> {NODE_CONFIG[k].title}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div data-popup className="absolute bottom-full left-0 z-[110] mb-2">
      {/* Related resources — a fixed-size panel; hovering reveals "All resources". */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover-reveal affordance */}
      <div
        onMouseEnter={open}
        onMouseLeave={scheduleClose}
        className="relative w-[320px] rounded-xl border border-border bg-popover p-2 shadow-xl"
      >
        <div className="flex items-center justify-between px-1 pb-1.5 text-sm text-muted-foreground">
          Related resources
          <ChevronRight className="size-4" />
        </div>
        {related.length ? (
          related.map((x) => <Row key={x.node.id} {...x} />)
        ) : (
          <p className="px-2 py-2 text-xs text-muted-foreground">No compatible nodes</p>
        )}

        {/* All resources — absolute flyout so the panel above never changes size */}
        {showAll ? (
          // biome-ignore lint/a11y/noStaticElementInteractions: hover-reveal affordance
          <div
            onMouseEnter={open}
            onMouseLeave={scheduleClose}
            className="absolute top-0 left-full ml-2 w-[320px] rounded-xl border border-border bg-popover p-2 shadow-xl"
          >
            <div className="px-1 pb-1.5 text-sm text-muted-foreground">All resources</div>
            {items.length ? (
              items.map((x) => <Row key={x.node.id} {...x} />)
            ) : (
              <p className="px-2 py-2 text-xs text-muted-foreground">No other nodes</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
