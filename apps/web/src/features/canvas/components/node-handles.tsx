import { Handle, type InternalNode, type Node, Position, useNodeId, useStore } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { NODE_CONFIG, type NodeKind, type Port } from "../lib/constants";

// Ported from runmycrew: bar on the border, expands to a half-pill on hover.
const BASE = "nodrag nopan !z-50 !cursor-crosshair !border-none !transition-all !duration-150";
const H_IN = cn(
  BASE,
  "!h-[18px] !w-[6px] !left-[-7px] !rounded-l-[3px] !rounded-r-none hover:!left-[-10px] hover:!rounded-l-full hover:!w-[9px]",
);
const H_OUT = cn(
  BASE,
  "!h-[18px] !w-[6px] !right-[-7px] !rounded-r-[3px] !rounded-l-none hover:!right-[-10px] hover:!rounded-r-full hover:!w-[9px]",
);

function topFor(count: number, index: number): string {
  return count === 1 ? "28px" : `${((index + 1) * 100) / (count + 1)}%`;
}

// Does this node have data to send? Text nodes must have non-empty text;
// media nodes carry their (eventual) output.
function nodeFlows(node: InternalNode<Node> | undefined): boolean {
  if (!node) return false;
  if (node.type === "text") {
    // Only real content flows downstream — not the node's own prompt.
    const data = node.data as Record<string, unknown>;
    return Boolean(String(data?.text ?? "").trim());
  }
  return true;
}

interface InputState {
  count: number;
  flowing: boolean;
}
interface HandleState {
  inputs: Record<string, InputState>;
  outputs: Record<string, number>;
  selfFlows: boolean;
}

function statesEqual(a: HandleState, b: HandleState): boolean {
  if (a.selfFlows !== b.selfFlows) return false;
  const ik = Object.keys(a.inputs);
  if (ik.length !== Object.keys(b.inputs).length) return false;
  for (const k of ik) {
    const x = a.inputs[k];
    const y = b.inputs[k];
    if (!y || x.count !== y.count || x.flowing !== y.flowing) return false;
  }
  const ok = Object.keys(a.outputs);
  if (ok.length !== Object.keys(b.outputs).length) return false;
  return ok.every((k) => a.outputs[k] === b.outputs[k]);
}

interface NodeHandlesProps {
  kind: NodeKind;
}

export function NodeHandles({ kind }: NodeHandlesProps) {
  const cfg = NODE_CONFIG[kind];
  const Icon = cfg.icon;
  const inputs = cfg.inputs;
  const outputs = cfg.outputs;
  const nodeId = useNodeId();

  const state = useStore((s) => {
    const inputMap: Record<string, InputState> = {};
    const outputMap: Record<string, number> = {};
    for (const edge of s.edges) {
      if (edge.target === nodeId && edge.targetHandle) {
        const cur = inputMap[edge.targetHandle] ?? { count: 0, flowing: false };
        cur.count += 1;
        if (nodeFlows(s.nodeLookup.get(edge.source))) cur.flowing = true;
        inputMap[edge.targetHandle] = cur;
      }
      if (edge.source === nodeId && edge.sourceHandle) {
        outputMap[edge.sourceHandle] = (outputMap[edge.sourceHandle] ?? 0) + 1;
      }
    }
    return {
      inputs: inputMap,
      outputs: outputMap,
      selfFlows: nodeFlows(s.nodeLookup.get(nodeId ?? "")),
    };
  }, statesEqual);

  return (
    <>
      {inputs.map((port, index) => {
        const info = state.inputs[port.id];
        return (
          <PortHandle
            key={port.id}
            Icon={Icon}
            port={port}
            isInput
            top={topFor(inputs.length, index)}
            count={info?.count ?? 0}
            green={Boolean(info?.flowing)}
          />
        );
      })}
      {outputs.map((port, index) => {
        const count = state.outputs[port.id] ?? 0;
        return (
          <PortHandle
            key={port.id}
            Icon={Icon}
            port={port}
            isInput={false}
            top={topFor(outputs.length, index)}
            count={count}
            green={count >= 1 && state.selfFlows}
          />
        );
      })}
    </>
  );
}

function PortHandle({
  Icon,
  port,
  isInput,
  top,
  count,
  green,
}: {
  Icon: LucideIcon;
  port: Port;
  isInput: boolean;
  top: string;
  count: number;
  green: boolean;
}) {
  const max = port.max ?? 1;
  const PortIcon = port.icon ?? Icon;

  return (
    <div className="group/port">
      <Handle
        type={isInput ? "target" : "source"}
        id={port.id}
        position={isInput ? Position.Left : Position.Right}
        className={cn(isInput ? H_IN : H_OUT, green ? "!bg-emerald-400" : "!bg-muted-foreground/50")}
        style={{ top, transform: "translateY(-50%)" }}
      />
      <div
        className={cn(
          "pointer-events-none absolute z-[60] flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground transition-opacity",
          isInput
            ? "left-0 -translate-x-full -translate-y-1/2 pr-3"
            : "right-0 translate-x-full -translate-y-1/2 pl-3",
          count >= 1 ? "opacity-0 group-hover/port:opacity-100" : "opacity-100",
        )}
        style={{ top }}
      >
        <PortIcon className="size-3.5" />
        <span>{port.label}</span>
        {isInput ? (
          <span className="text-muted-foreground/50">
            {count}/{max}
          </span>
        ) : null}
      </div>
    </div>
  );
}
