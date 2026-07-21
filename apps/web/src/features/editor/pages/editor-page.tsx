"use client";

import type {
  Edge,
  IsValidConnection,
  Node,
  OnConnectEnd,
  ReactFlowInstance,
} from "@xyflow/react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExecutionConsole, useExecution } from "@/features/executions";
import { getWorkflowOutputs, updateWorkflow, uploadAsset, useWorkflow } from "@/features/projects";
import { AssistantButton } from "../components/assistant-button";
import { AssistantPanel } from "../components/assistant-panel";
import { CanvasContextMenu } from "../components/canvas-context-menu";
import { EditorBackButton } from "../components/editor-back-button";
import { EditorCanvas } from "../components/editor-canvas";
import { type CanvasTool, EditorControls } from "../components/editor-controls";
import { EditorEmptyState } from "../components/editor-empty-state";
import { EditorToolbar } from "../components/editor-toolbar";
import { NodeKindMenu } from "../components/node-kind-menu";
import { NODE_CONFIG, type NodeKind, type Port } from "../constants";
import { EditorActionsProvider } from "../editor-actions";
import { popupRegistry } from "../popup-registry";
import { ExecutionStatusProvider } from "../execution-status";
import { useAssistant } from "../hooks/use-assistant";
import { useAutoDetachEmptyText } from "../hooks/use-auto-detach";
import { useCanvas } from "../hooks/use-canvas";

interface DropPicker {
  x: number;
  y: number;
  flow: { x: number; y: number };
  source: string;
  sourceHandle: string | null;
}

type SaveState = "idle" | "saving" | "saved";

const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|xml|ya?ml|html?|log|rtf|doc|docx|odt)$/i;

// Route an uploaded file to a node kind by its media family; everything
// non-media (txt, md, csv, doc…) goes to a text node.
function fileKind(file: File): "image" | "video" | "audio" | "text" {
  const t = file.type;
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  if (t.startsWith("text/") || TEXT_EXT.test(file.name)) return "text";
  return "text";
}

// Strip ReactFlow's transient fields before persisting.
function serializeGraph(nodes: Node[], edges: Edge[]) {
  return {
    nodes: nodes.map((n) => {
      // `upload` is transient UI state (progress) — never persist it.
      const { upload: _upload, ...data } = (n.data ?? {}) as Record<string, unknown>;
      return { id: n.id, type: n.type, position: n.position, data };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      type: e.type,
    })),
  };
}

// Loads the workflow (if any) then mounts the editor with its graph.
export function EditorPage({ projectId }: { projectId?: string }) {
  const { data, isLoading } = useWorkflow(projectId);

  if (projectId && isLoading) {
    return (
      <div className="grid h-full place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const graph = data?.graph ?? { nodes: [], edges: [] };
  return (
    <EditorWorkspace
      key={projectId ?? "new"}
      projectId={projectId}
      initialNodes={graph.nodes as Node[]}
      initialEdges={graph.edges as Edge[]}
    />
  );
}

interface EditorWorkspaceProps {
  projectId?: string;
  initialNodes: Node[];
  initialEdges: Edge[];
}

function EditorWorkspace({ projectId, initialNodes, initialEdges }: EditorWorkspaceProps) {
  const { open, openAssistant, closeAssistant } = useAssistant();
  const {
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
  } = useCanvas(initialNodes, initialEdges);

  const execution = useExecution();

  // Save the current graph, then run just this node (+ its ancestors).
  const graphRef = useRef({ nodes, edges });
  graphRef.current = { nodes, edges };
  const runNode = useCallback(
    (nodeId: string) => {
      if (!projectId) return;
      const { nodes, edges } = graphRef.current;
      updateWorkflow(projectId, { graph: serializeGraph(nodes, edges) })
        .catch(() => {})
        .finally(() => execution.run(projectId, nodeId));
    },
    [projectId, execution.run],
  );

  const actions = useMemo(
    () => ({
      duplicateNode,
      removeNode,
      toggleLock,
      removeEdge,
      insertNodeOnEdge,
      setNodeData,
      addConnectedNode,
      runNode,
    }),
    [
      duplicateNode,
      removeNode,
      toggleLock,
      removeEdge,
      insertNodeOnEdge,
      setNodeData,
      addConnectedNode,
      runNode,
    ],
  );

  const queryClient = useQueryClient();
  useAutoDetachEmptyText(nodes, edges, removeEdge);
  const rf = useRef<ReactFlowInstance | null>(null);
  const [picker, setPicker] = useState<DropPicker | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; flow: { x: number; y: number } } | null>(
    null,
  );
  const [tool, setTool] = useState<CanvasTool>("hand");

  // Debounced autosave of the graph when a project is loaded.
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const firstRun = useRef(true);
  useEffect(() => {
    if (!projectId) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState("saving");
    const timer = setTimeout(() => {
      updateWorkflow(projectId, { graph: serializeGraph(nodes, edges) })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("idle"));
    }, 800);
    return () => clearTimeout(timer);
  }, [nodes, edges, projectId]);

  // Enforce per-input-handle max connections at the connection-validation layer
  // (so handles stay connectable and keep their hover behaviour).
  const isValidConnection = useCallback<IsValidConnection>(
    (conn) => {
      if (!conn.target || !conn.targetHandle) return true;
      const target = nodes.find((n) => n.id === conn.target);
      const port = NODE_CONFIG[target?.type as NodeKind]?.inputs.find(
        (p) => p.id === conn.targetHandle,
      ) as Port | undefined;
      const max = port?.max ?? 1;
      const current = edges.filter(
        (e) => e.target === conn.target && e.targetHandle === conn.targetHandle,
      ).length;
      return current < max;
    },
    [nodes, edges],
  );

  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    if (!rf.current) return;
    const flow = rf.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setMenu({ x: event.clientX, y: event.clientY, flow });
  }, []);

  const onConnectEnd = useCallback<OnConnectEnd>((event, connectionState) => {
    if (connectionState.isValid || !connectionState.fromNode || !rf.current) return;
    const point = "clientX" in event ? event : event.changedTouches[0];
    const flow = rf.current.screenToFlowPosition({ x: point.clientX, y: point.clientY });
    setPicker({
      x: point.clientX,
      y: point.clientY,
      flow,
      source: connectionState.fromNode.id,
      sourceHandle: connectionState.fromHandle?.id ?? null,
    });
  }, []);

  const handlePick = (kind: NodeKind) => {
    if (!picker) return;
    const id = addNodeAt(kind, picker.flow);
    connectNodes(picker.source, picker.sourceHandle, id);
    setPicker(null);
  };

  // Upload a media file → drop it on the canvas as a source node whose output is
  // the uploaded asset (stored by key; re-presigned for display and downstream).
  const handleUpload = useCallback(
    async (file: File) => {
      const flow = rf.current
        ? rf.current.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
        : { x: 0, y: 0 };

      const kind = fileKind(file);

      // Text files become a text node — content lives in the graph, no storage.
      if (kind === "text") {
        const text = await file.text();
        const id = addNodeAt("text", flow);
        setNodeData(id, { mode: "text", text, label: file.name });
        return;
      }

      // Media: drop the node immediately in an uploading state, stream progress,
      // then fill in the asset. Remove it + report if the upload fails.
      const id = addNodeAt(kind, flow);
      setNodeData(id, { label: file.name, upload: { name: file.name, progress: 0 } });
      try {
        const { key, url } = await uploadAsset(file, (progress) =>
          setNodeData(id, { upload: { name: file.name, progress } }),
        );
        setNodeData(id, { upload_key: key, upload: undefined });
        execution.seedOutputs({ [id]: url });
      } catch (err) {
        removeNode(id);
        alert(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [addNodeAt, setNodeData, removeNode, execution.seedOutputs],
  );

  // Credits change during a run — refresh the balance when it settles.
  useEffect(() => {
    if (execution.status === "completed" || execution.status === "failed") {
      queryClient.invalidateQueries({ queryKey: ["balance"] });
    }
  }, [execution.status, queryClient]);

  // Rehydrate previously-generated media outputs (refresh / cross-device open).
  const { seedOutputs } = execution;
  useEffect(() => {
    if (!projectId) return;
    getWorkflowOutputs(projectId)
      .then(seedOutputs)
      .catch(() => {});
  }, [projectId, seedOutputs]);

  // Drop generated text into the node's text field, as if typed.
  useEffect(() => {
    for (const [nodeId, text] of Object.entries(execution.nodeTexts)) {
      setNodeData(nodeId, { mode: "text", text });
    }
  }, [execution.nodeTexts, setNodeData]);

  return (
    <EditorActionsProvider value={actions}>
      <ExecutionStatusProvider
        value={{ statuses: execution.nodeStatuses, outputs: execution.nodeOutputs }}
      >
        <div
          className="relative h-full w-full"
          onClickCapture={(e) => {
            // If a node popup is open, a canvas click closes it first — and we
            // stop React Flow (which deselects on click) from clearing the node.
            // The next click, with no popup open, deselects normally.
            if (
              popupRegistry.hasOpen() &&
              !(e.target as HTMLElement).closest("[data-popup]")
            ) {
              e.stopPropagation();
              popupRegistry.closeAll();
            }
          }}
        >
        <EditorCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          onPaneContextMenu={onPaneContextMenu}
          isValidConnection={isValidConnection}
          tool={tool}
          onInit={(instance) => {
            rf.current = instance;
          }}
        />

        <EditorControls
          tool={tool}
          onToolChange={setTool}
          onUndo={() => {}}
          onRedo={() => {}}
          onFitView={() => rf.current?.fitView({ maxZoom: 0.85, duration: 300 })}
        />

        <div className="absolute left-4 top-4 z-10 flex items-center gap-3">
          <EditorBackButton />
          {projectId && saveState !== "idle" ? (
            <span className="text-xs text-muted-foreground">
              {saveState === "saving" ? "Saving…" : "Saved"}
            </span>
          ) : null}
        </div>

        {execution.status !== "idle" ? (
          <div className="absolute bottom-4 left-1/2 z-30 w-[560px] -translate-x-1/2">
            <ExecutionConsole
              logs={execution.logs}
              status={execution.status}
              error={execution.error}
              onClose={execution.reset}
            />
          </div>
        ) : null}

        <EditorToolbar onAddNode={addNode} onUpload={handleUpload} />

        {nodes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-[5]">
            <EditorEmptyState onAddNode={addNode} />
          </div>
        ) : null}

        {!open ? (
          <div className="absolute bottom-4 right-4 z-10">
            <AssistantButton onClick={openAssistant} />
          </div>
        ) : (
          <div className="absolute bottom-4 right-4 top-4 z-20 w-96">
            <AssistantPanel onClose={closeAssistant} />
          </div>
        )}

        {picker ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPicker(null)} />
            <div className="fixed z-50" style={{ left: picker.x, top: picker.y }}>
              <NodeKindMenu onSelect={handlePick} />
            </div>
          </>
        ) : null}

        {menu ? (
          <CanvasContextMenu
            x={menu.x}
            y={menu.y}
            onAddNode={(kind) => addNodeAt(kind, menu.flow)}
            onClose={() => setMenu(null)}
          />
        ) : null}
        </div>
      </ExecutionStatusProvider>
    </EditorActionsProvider>
  );
}
