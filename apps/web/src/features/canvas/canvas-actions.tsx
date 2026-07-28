"use client";

import { createContext, useContext } from "react";
import type { NodeKind } from "./constants";

// All canvas mutations flow through here so they hit the single useCanvas
// state source — avoids the controlled-mode desync of useReactFlow().setNodes.
export interface CanvasActions {
  duplicateNode: (id: string) => void;
  removeNode: (id: string) => void;
  toggleLock: (id: string) => void;
  removeEdge: (id: string) => void;
  insertNodeOnEdge: (edgeId: string, kind: NodeKind, position: { x: number; y: number }) => void;
  setNodeData: (id: string, patch: Record<string, unknown>) => void;
  addConnectedNode: (sourceId: string, kind: NodeKind) => void;
  // Create a node feeding a target's input handle (e.g. an upload → image input).
  addInputNode: (
    targetId: string,
    kind: NodeKind,
    targetHandle: string,
    data?: Record<string, unknown>,
  ) => string;
  runNode: (nodeId: string) => void;
  // Drop action result(s) as new nodes near the source (image by default).
  addImageResults: (
    sourceId: string,
    results: { key: string; url: string }[],
    kind?: NodeKind,
  ) => void;
}

const CanvasActionsContext = createContext<CanvasActions | null>(null);

export const CanvasActionsProvider = CanvasActionsContext.Provider;

export function useCanvasActions() {
  const ctx = useContext(CanvasActionsContext);
  if (!ctx) throw new Error("useCanvasActions must be used within CanvasActionsProvider");
  return ctx;
}
