import {
  addEdge,
  type Connection,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback } from "react";
import type { NodeKind } from "../constants";

let seq = 0;

const newNodeId = () => `node-${crypto.randomUUID()}`;

export function useCanvas(initialNodes: Node[] = [], initialEdges: Edge[] = []) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

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

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, type: "custom" }, eds)),
    [setEdges],
  );

  const connectNodes = useCallback(
    (source: string, sourceHandle: string | null, target: string) => {
      setEdges((eds) => [
        ...eds,
        {
          id: `${source}-${target}-${crypto.randomUUID().slice(0, 8)}`,
          source,
          target,
          sourceHandle: sourceHandle ?? undefined,
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
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        { id, type: kind, position, data: { kind }, selected: true },
      ]);
      setEdges((eds) => [
        ...eds,
        { id: `${sourceId}-${id}`, source: sourceId, target: id, type: "custom" },
      ]);
    },
    [nodes, setNodes, setEdges],
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
  };
}
