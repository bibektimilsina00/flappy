import {
  addEdge,
  type Connection,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useRef } from "react";
import { type NodeKind, resolveTargetHandle } from "../lib/constants";

let seq = 0;

const newNodeId = () => `node-${crypto.randomUUID()}`;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function useCanvas(initialNodes: Node[] = [], initialEdges: Edge[] = []) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const clipboard = useRef<{ type?: string; data: Record<string, unknown>; position: { x: number; y: number } } | null>(
    null,
  );

  const addNode = useCallback(
    (kind: NodeKind) => {
      setNodes((current) => {
        seq += 1;
        return [
          ...current,
          {
            id: newNodeId(),
            type: kind,
            position: { x: 240 + (current.length % 4) * 300, y: 140 + current.length * 40 },
            data: { kind },
          },
        ];
      });
    },
    [setNodes],
  );

  const addNodeAt = useCallback(
    (kind: NodeKind, position: { x: number; y: number }) => {
      const id = newNodeId();
      setNodes((nds) => [...nds, { id, type: kind, position, data: { kind } }]);
      return id;
    },
    [setNodes],
  );

  // Type-checked connect: route to the compatible input handle (auto-switching
  // when the user dropped on a mismatched one), or drop the connection entirely
  // if the target has no handle that accepts the source's output type.
  const onConnect = useCallback(
    (connection: Connection) => {
      const source = nodes.find((n) => n.id === connection.source);
      const target = nodes.find((n) => n.id === connection.target);
      if (!source?.type || !target?.type) return;
      const targetHandle = resolveTargetHandle(
        source.type as NodeKind,
        target.type as NodeKind,
        connection.targetHandle,
      );
      if (!targetHandle) return;
      setEdges((eds) => addEdge({ ...connection, targetHandle, type: "custom" }, eds));
    },
    [nodes, setEdges],
  );

  const connectNodes = useCallback(
    (source: string, sourceHandle: string | null, target: string, targetHandle?: string | null) => {
      setEdges((eds) => [
        ...eds,
        {
          id: `${source}-${target}-${crypto.randomUUID().slice(0, 8)}`,
          source,
          target,
          sourceHandle: sourceHandle ?? undefined,
          targetHandle: targetHandle ?? undefined,
          type: "custom",
        },
      ]);
    },
    [setEdges],
  );

  const duplicateNode = useCallback(
    (id: string) => {
      setNodes((nds) => {
        const node = nds.find((n) => n.id === id);
        if (!node) return nds;
        return [
          ...nds.map((n) => ({ ...n, selected: false })),
          {
            ...node,
            id: newNodeId(),
            position: { x: node.position.x + 48, y: node.position.y + 48 },
            selected: true,
          },
        ];
      });
    },
    [setNodes],
  );

  const removeNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges],
  );

  const toggleLock = useCallback(
    (id: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const locked = Boolean((n.data as { locked?: boolean }).locked);
          return { ...n, draggable: locked, data: { ...n.data, locked: !locked } };
        }),
      );
    },
    [setNodes],
  );

  const removeEdge = useCallback(
    (id: string) => setEdges((eds) => eds.filter((e) => e.id !== id)),
    [setEdges],
  );

  const setNodeData = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [setNodes],
  );

  const addConnectedNode = useCallback(
    (sourceId: string, kind: NodeKind) => {
      const source = nodes.find((n) => n.id === sourceId);
      const id = newNodeId();
      const position = source
        ? { x: source.position.x + 400, y: source.position.y }
        : { x: 240, y: 140 };
      // Route to the compatible input handle (e.g. text → the video's prompt input).
      const targetHandle = source?.type
        ? resolveTargetHandle(source.type as NodeKind, kind)
        : null;
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        { id, type: kind, position, data: { kind }, selected: true },
      ]);
      setEdges((eds) => [
        ...eds,
        {
          id: `${sourceId}-${id}`,
          source: sourceId,
          target: id,
          targetHandle: targetHandle ?? undefined,
          type: "custom",
        },
      ]);
    },
    [nodes, setNodes, setEdges],
  );

  // Create a node to the LEFT of a target and connect its output into the
  // target's given input handle (e.g. an upload-image node → image input).
  const addInputNode = useCallback(
    (targetId: string, kind: NodeKind, targetHandle: string, data: Record<string, unknown> = {}) => {
      const target = nodes.find((n) => n.id === targetId);
      const id = newNodeId();
      const position = target
        ? { x: target.position.x - 400, y: target.position.y }
        : { x: 240, y: 140 };
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        { id, type: kind, position, data: { kind, ...data }, selected: true },
      ]);
      setEdges((eds) => [
        ...eds,
        { id: `${id}-${targetId}`, source: id, target: targetId, targetHandle, type: "custom" },
      ]);
      return id;
    },
    [nodes, setNodes, setEdges],
  );

  // Drop a decoration sticker (note / rectangle / line / emoji / image) at a point.
  const addSticker = useCallback(
    (variant: string, position: { x: number; y: number }) => {
      const dims: Record<string, [number, number]> = {
        note: [220, 160],
        rectangle: [200, 140],
        line: [220, 20],
        emoji: [90, 90],
        image: [220, 220],
      };
      const [width, height] = dims[variant] ?? [180, 120];
      const id = newNodeId();
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        { id, type: "sticker", position, width, height, data: { variant }, selected: true },
      ]);
      return id;
    },
    [setNodes],
  );

  // Copy the node's shape to the clipboard (drop transient upload progress).
  const copyNode = useCallback(
    (id: string) => {
      const n = nodes.find((x) => x.id === id);
      if (!n) return;
      const { upload: _upload, ...data } = (n.data ?? {}) as Record<string, unknown>;
      clipboard.current = { type: n.type, data: clone(data), position: { ...n.position } };
    },
    [nodes],
  );

  // Paste the clipboard as a new selected node, cascading on repeats.
  const pasteNode = useCallback(
    (position?: { x: number; y: number }) => {
      const c = clipboard.current;
      if (!c) return;
      const id = newNodeId();
      const pos = position ?? { x: c.position.x + 48, y: c.position.y + 48 };
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        { id, type: c.type, position: pos, data: clone(c.data), selected: true },
      ]);
      clipboard.current = { ...c, position: pos };
      return id;
    },
    [setNodes],
  );

  // Create N nodes of `kind` fanned out to the right of a source node (used by
  // the Actions to drop their results). Returns the new node ids in order.
  const addImageNodes = useCallback(
    (sourceId: string, count: number, kind: NodeKind = "image"): string[] => {
      const source = nodes.find((n) => n.id === sourceId);
      const baseX = (source?.position.x ?? 240) + 420;
      const baseY = source?.position.y ?? 140;
      const ids: string[] = [];
      const created: Node[] = [];
      for (let i = 0; i < count; i++) {
        const id = newNodeId();
        ids.push(id);
        created.push({
          id,
          type: kind,
          position: { x: baseX + (i % 3) * 320, y: baseY + Math.floor(i / 3) * 360 },
          data: { kind },
        });
      }
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...created]);
      return ids;
    },
    [nodes, setNodes],
  );

  // Restack a node above the others (React Flow renders array order last-on-top).
  const bringToFront = useCallback(
    (id: string) => {
      setNodes((nds) => {
        const n = nds.find((x) => x.id === id);
        return n ? [...nds.filter((x) => x.id !== id), n] : nds;
      });
    },
    [setNodes],
  );

  const insertNodeOnEdge = useCallback(
    (edgeId: string, kind: NodeKind, position: { x: number; y: number }) => {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) return;
      const id = newNodeId();
      setNodes((nds) => [...nds, { id, type: kind, position, data: { kind } }]);
      setEdges((eds) => [
        ...eds.filter((e) => e.id !== edgeId),
        {
          id: `${edge.source}-${id}`,
          source: edge.source,
          target: id,
          sourceHandle: edge.sourceHandle,
          type: "custom",
        },
        {
          id: `${id}-${edge.target}`,
          source: id,
          target: edge.target,
          targetHandle: edge.targetHandle,
          type: "custom",
        },
      ]);
    },
    [edges, setNodes, setEdges],
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addNodeAt,
    connectNodes,
    duplicateNode,
    removeNode,
    toggleLock,
    removeEdge,
    insertNodeOnEdge,
    setNodeData,
    addConnectedNode,
    addInputNode,
    addSticker,
    copyNode,
    pasteNode,
    bringToFront,
    addImageNodes,
  };
}
