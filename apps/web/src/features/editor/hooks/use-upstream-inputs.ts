import { useStore } from "@xyflow/react";

export interface UpstreamInput {
  edgeId: string;
  text: string;
}

const equal = (a: UpstreamInput[], b: UpstreamInput[]) =>
  a.length === b.length && a.every((x, i) => x.edgeId === b[i].edgeId && x.text === b[i].text);

// Text inputs feeding this node (upstream nodes' written text/prompt), each with
// the edge id so a chip can detach it. Reactive to edges + upstream edits.
export function useUpstreamInputs(nodeId: string): UpstreamInput[] {
  return useStore((s) => {
    const inputs: UpstreamInput[] = [];
    for (const edge of s.edges) {
      if (edge.target !== nodeId) continue;
      const data = s.nodeLookup.get(edge.source)?.data as Record<string, unknown> | undefined;
      const text = (data?.text ?? data?.prompt) as string | undefined;
      if (text?.trim()) inputs.push({ edgeId: edge.id, text: text.trim() });
    }
    return inputs;
  }, equal);
}
