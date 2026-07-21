"use client";

import { createContext, useContext } from "react";
import type { NodeKind } from "./constants";

// All canvas mutations flow through here so they hit the single useCanvas
// state source — avoids the controlled-mode desync of useReactFlow().setNodes.
export interface EditorActions {
  duplicateNode: (id: string) => void;
  removeNode: (id: string) => void;
  toggleLock: (id: string) => void;
  removeEdge: (id: string) => void;
  insertNodeOnEdge: (edgeId: string, kind: NodeKind, position: { x: number; y: number }) => void;
  setNodeData: (id: string, patch: Record<string, unknown>) => void;
  addConnectedNode: (sourceId: string, kind: NodeKind) => void;
  runNode: (nodeId: string) => void;
}

const EditorActionsContext = createContext<EditorActions | null>(null);

export const EditorActionsProvider = EditorActionsContext.Provider;

export function useEditorActions() {
  const ctx = useContext(EditorActionsContext);
  if (!ctx) throw new Error("useEditorActions must be used within EditorActionsProvider");
  return ctx;
}
