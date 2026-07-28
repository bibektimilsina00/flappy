import { useStore } from "@xyflow/react";
import { NODE_CONFIG, type NodeKind } from "../constants";
import { useOutputs } from "../execution-status";

export interface UpstreamInput {
  edgeId: string;
  text: string;
}

export interface UpstreamImage {
  edgeId: string;
  url: string;
}

const refsEqual = (a: { edgeId: string; source: string }[], b: { edgeId: string; source: string }[]) =>
  a.length === b.length && a.every((x, i) => x.edgeId === b[i].edgeId && x.source === b[i].source);

// Image references feeding this node: upstream image nodes connected to a node
// that supports image input. Each carries the source's current output URL (from
// the run/seed outputs) and the edge id to detach it.
export function useUpstreamImages(nodeId: string): UpstreamImage[] {
  const outputs = useOutputs();
  const refs = useStore((s) => {
    const self = s.nodeLookup.get(nodeId)?.type as NodeKind | undefined;
    const acceptsImage = self ? NODE_CONFIG[self]?.inputs.some((p) => p.id === "image") : false;
    if (!acceptsImage) return [];
    const out: { edgeId: string; source: string }[] = [];
    for (const edge of s.edges) {
      if (edge.target !== nodeId) continue;
      if (s.nodeLookup.get(edge.source)?.type === "image") {
        out.push({ edgeId: edge.id, source: edge.source });
      }
    }
    return out;
  }, refsEqual);
  return refs
    .map((r) => ({ edgeId: r.edgeId, url: outputs[r.source] }))
    .filter((r): r is UpstreamImage => Boolean(r.url));
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
      // Only the text node's content (data.text) flows downstream — never its
      // own prompt (the instruction used to generate that text).
      const text = data?.text as string | undefined;
      if (text?.trim()) inputs.push({ edgeId: edge.id, text: text.trim() });
    }
    return inputs;
  }, equal);
}
