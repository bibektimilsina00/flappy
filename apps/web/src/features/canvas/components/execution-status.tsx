"use client";

import { createContext, useContext } from "react";
import type { NodeStatus } from "@/features/executions";

interface ExecutionStatus {
  statuses: Record<string, NodeStatus>;
  outputs: Record<string, string>; // node id -> asset url
  seedOutputs?: (outputs: Record<string, string>) => void;
}

// Runtime run state — kept out of node.data so it never gets persisted.
const ExecutionStatusContext = createContext<ExecutionStatus>({ statuses: {}, outputs: {} });

export const ExecutionStatusProvider = ExecutionStatusContext.Provider;

export function useNodeStatus(nodeId: string): NodeStatus | undefined {
  return useContext(ExecutionStatusContext).statuses[nodeId];
}

export function useNodeOutput(nodeId: string): string | undefined {
  return useContext(ExecutionStatusContext).outputs[nodeId];
}

export function useOutputs(): Record<string, string> {
  return useContext(ExecutionStatusContext).outputs;
}

// Set/replace a node's displayed output (used by in-node edits: crop, precision
// edit, replace).
export function useSetNodeOutput(): (nodeId: string, url: string) => void {
  const seed = useContext(ExecutionStatusContext).seedOutputs;
  return (nodeId, url) => seed?.({ [nodeId]: url });
}
