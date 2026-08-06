import { Handle, type InternalNode, type Node, Position, useNodeId, useStore } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { NODE_CONFIG, type NodeKind, type Port } from "../../lib/constants";

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

function nodeFlows(node: InternalNode<Node> | undefined): boolean {
  if (!node) return false;
  if (node.type === "text") {
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
      {inputs.map((port, i) => {
        const info = state.inputs[port.id] ?? { count: 0, flowing: false };
        return (
          <PortHandle
            key={port.id}
            isInput
            port={port}
            top={topFor(inputs.length, i)}
            count={info.count}
            flowing={info.flowing}
          />
        );
      })}

      {outputs.map((port, i) => {
        const count = state.outputs[port.id] ?? 0;
        return (
          <PortHandle
            key={port.id}
            isInput={false}
            port={port}
            top={topFor(outputs.length, i)}
            count={count}
            flowing={state.selfFlows}
          />
        );
      })}
    </>
  );
}

function PortHandle({
  isInput,
  port,
  top,
  count,
  flowing,
}: {
  isInput: boolean;
  port: Port;
  top: string;
  count: number;
  flowing: boolean;
}) {
  const PortIcon = port.icon;
  const max = port.max ?? 1;
  const isFull = isInput && count >= max;

  const bg = flowing
    ? "!bg-[#14b8a6] !shadow-[0_0_8px_rgba(20,184,166,0.6)]"
    : count > 0
      ? "!bg-foreground/70"
      : "!bg-muted-foreground/40 hover:!bg-foreground";

  return (
    <div className="group/port">
      <Handle
        type={isInput ? "target" : "source"}
        position={isInput ? Position.Left : Position.Right}
        id={port.id}
        isConnectable={!isFull}
        className={cn(isInput ? H_IN : H_OUT, bg)}
        style={{ top }}
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
        {PortIcon ? <PortIcon className="size-3.5" /> : null}
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
