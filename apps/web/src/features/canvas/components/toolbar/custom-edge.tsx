"use client";

import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath } from "@xyflow/react";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { NodeKind } from "../../lib/constants";
import { useCanvasActions } from "../canvas-actions";
import { NodeKindMenu } from "../nodes/node-kind-menu";

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const { removeNode, addConnectedNode } = useCanvasActions();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? "#14b8a6" : "rgba(255,255,255,0.25)",
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan group/edge flex items-center gap-1"
        >
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-md transition-all hover:bg-accent hover:text-foreground group-hover/edge:opacity-100"
          >
            <Plus className="size-3.5" />
          </button>

          {selected ? (
            <button
              type="button"
              onClick={() => removeNode(id)}
              className="flex size-6 items-center justify-center rounded-full border border-destructive/40 bg-card text-destructive shadow-md transition-all hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}

          {menuOpen ? (
            <div className="absolute top-full left-1/2 z-50 mt-1 -translate-x-1/2">
              <NodeKindMenu
                onSelect={(kind) => {
                  addConnectedNode(id, kind);
                  setMenuOpen(false);
                }}
              />
            </div>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
