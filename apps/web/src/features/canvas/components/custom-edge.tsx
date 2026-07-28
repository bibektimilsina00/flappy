"use client";

import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath } from "@xyflow/react";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { NodeKind } from "../constants";
import { useCanvasActions } from "../canvas-actions";
import { NodeKindMenu } from "./node-kind-menu";

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { removeEdge, insertNodeOnEdge } = useCanvasActions();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  const insert = (kind: NodeKind) => {
    setMenuOpen(false);
    insertNodeOnEdge(id, kind, {
      x: (sourceX + targetX) / 2 - 160,
      y: (sourceY + targetY) / 2 - 40,
    });
  };

  const active = hovered || menuOpen;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: active ? "rgba(138,138,138,0.9)" : "rgba(138,138,138,0.5)",
          strokeWidth: active ? 2.5 : 2,
        }}
      />
      {/* Wide invisible path for easier hover. */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {active ? (
            <div className="relative flex items-center gap-1">
              <button
                type="button"
                title="Insert node"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex size-5 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3" />
              </button>
              <button
                type="button"
                title="Delete edge"
                onClick={() => removeEdge(id)}
                className="flex size-5 items-center justify-center rounded-md border border-border bg-card text-destructive shadow-sm transition-colors hover:bg-accent"
              >
                <Trash2 className="size-3" />
              </button>

              {menuOpen ? (
                <div className="absolute left-1/2 top-6 z-50 -translate-x-1/2">
                  <NodeKindMenu onSelect={insert} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
