"use client";

import { createContext, useContext } from "react";
import type { NodeStatus } from "@/features/executions";

interface ExecutionStatus {
  statuses: Record<string, NodeStatus>;
  outputs: Record<string, string>; // node id -> asset url
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
