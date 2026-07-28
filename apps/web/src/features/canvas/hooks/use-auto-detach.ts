import type { Edge, Node } from "@xyflow/react";
import { useEffect, useRef } from "react";

// When a connected text node's text is cleared, drop the edge. Guarded on
// "had text before" so connecting an empty node then typing still works.
export function useAutoDetachEmptyText(
  nodes: Node[],
  edges: Edge[],
  removeEdge: (id: string) => void,
) {
  const hadText = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const next: Record<string, boolean> = {};

    for (const edge of edges) {
      const source = byId.get(edge.source);
      if (source?.type !== "text") continue;
      const data = source.data as Record<string, unknown> | undefined;
      const text = (data?.text ?? data?.prompt) as string | undefined;
      const has = Boolean(text?.trim());
      next[edge.id] = has;
      if (hadText.current[edge.id] && !has) removeEdge(edge.id);
    }

    hadText.current = next;
  }, [nodes, edges, removeEdge]);
}
