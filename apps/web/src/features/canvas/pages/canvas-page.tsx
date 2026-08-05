"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
	type Edge,
	type IsValidConnection,
	type Node,
	type OnConnectEnd,
	type ReactFlowInstance,
	ReactFlowProvider,
} from "@xyflow/react";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useExecution } from "@/features/executions";
import {
	getWorkflowOutputs,
	updateWorkflow,
	uploadAsset,
	useWorkflow,
} from "@/features/projects";
import { EditorModeTabs } from "@/shared/components/editor-mode-tabs";
import { CanvasActionsProvider } from "../components/canvas-actions";
import { AssistantButton } from "../components/assistant-button";
import { AssistantPanel } from "../components/assistant-panel";
import { CanvasContextMenu } from "../components/canvas-context-menu";
import { CanvasControls, type CanvasTool } from "../components/canvas-controls";
import { CanvasEmptyState } from "../components/canvas-empty-state";
import { CanvasToolbar } from "../components/canvas-toolbar";
import { ExecutionStatusProvider } from "../components/execution-status";
import { FlowCanvas } from "../components/flow-canvas";
import { NodeContextMenu } from "../components/node-context-menu";
import { NodeKindMenu } from "../components/node-kind-menu";
import { useAssistant } from "../hooks/use-assistant";
import {
	type AssistantOp,
	useAssistantChat,
} from "../hooks/use-assistant-chat";
import { useAutoDetachEmptyText } from "../hooks/use-auto-detach";
import { useCanvas } from "../hooks/use-canvas";
import {
	NODE_CONFIG,
	type NodeKind,
	type Port,
	resolveTargetHandle,
} from "../lib/constants";
import { popupRegistry } from "../lib/popup-registry";

interface DropPicker {
	x: number;
	y: number;
	flow: { x: number; y: number };
	source: string;
	sourceHandle: string | null;
}

type SaveState = "idle" | "saving" | "saved";

const TEXT_EXT =
	/\.(txt|md|markdown|csv|tsv|json|xml|ya?ml|html?|log|rtf|doc|docx|odt)$/i;

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
			const { upload: _upload, ...data } = (n.data ?? {}) as Record<
				string,
				unknown
			>;
			const base = { id: n.id, type: n.type, position: n.position, data };
			// Stickers carry their own (resizable) dimensions.
			return n.type === "sticker"
				? { ...base, width: n.width, height: n.height }
				: base;
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
export function CanvasPage({
	projectId,
	runOnLoad,
}: {
	projectId?: string;
	runOnLoad?: string;
}) {
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
		<CanvasWorkspace
			key={projectId ?? "new"}
			projectId={projectId}
			runOnLoad={runOnLoad}
			initialNodes={graph.nodes as Node[]}
			initialEdges={graph.edges as Edge[]}
		/>
	);
}

interface CanvasWorkspaceProps {
	projectId?: string;
	runOnLoad?: string;
	initialNodes: Node[];
	initialEdges: Edge[];
}

function CanvasWorkspace({
	projectId,
	runOnLoad,
	initialNodes,
	initialEdges,
}: CanvasWorkspaceProps) {
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
		addInputNode,
		addSticker,
		copyNode,
		pasteNode,
		bringToFront,
		addImageNodes,
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

	// Auto-run a node once when arriving from the dashboard composer
	// (/canvas?project=…&run=nodeId). Strip the param so a refresh won't re-run.
	const didAutoRun = useRef(false);
	useEffect(() => {
		if (!runOnLoad || !projectId || didAutoRun.current) return;
		didAutoRun.current = true;
		const t = setTimeout(() => {
			runNode(runOnLoad);
			window.history.replaceState(null, "", `/canvas?project=${projectId}`);
		}, 300);
		return () => clearTimeout(t);
	}, [runOnLoad, projectId, runNode]);

	const addImageResults = useCallback(
		(
			sourceId: string,
			results: { key: string; url: string }[],
			kind: NodeKind = "image",
		) => {
			const ids = addImageNodes(sourceId, results.length, kind);
			results.forEach((r, i) => {
				setNodeData(ids[i], { upload_key: r.key });
				execution.seedOutputs({ [ids[i]]: r.url });
			});
		},
		[addImageNodes, setNodeData, execution.seedOutputs],
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
			addInputNode,
			runNode,
			addImageResults,
		}),
		[
			duplicateNode,
			removeNode,
			toggleLock,
			removeEdge,
			insertNodeOnEdge,
			setNodeData,
			addConnectedNode,
			addInputNode,
			runNode,
			addImageResults,
		],
	);

	// ── AI assistant ──────────────────────────────────────────────────────────
	const getAssistantNodes = useCallback(
		() =>
			graphRef.current.nodes.map((n) => ({
				id: n.id,
				type: n.type,
				data: (n.data ?? {}) as Record<string, unknown>,
			})),
		[],
	);

	const applyAssistantOps = useCallback(
		(ops: AssistantOp[]) => {
			const idMap = new Map<string, string>();
			const kindOf = new Map<string, string>();
			for (const n of graphRef.current.nodes)
				if (n.type) kindOf.set(n.id, n.type);
			const resolve = (mid: string) => idMap.get(mid) ?? mid;
			const setFields = (
				id: string,
				op: { prompt?: string; text?: string; model?: string; params?: string },
			) => {
				const data: Record<string, unknown> = {};
				if (op.prompt) data.prompt = op.prompt;
				if (op.text) {
					data.text = op.text;
					data.mode = "text";
				}
				if (op.model) data.model = op.model;
				if (op.params) {
					try {
						data.params = JSON.parse(op.params);
					} catch {
						/* ignore malformed params */
					}
				}
				if (Object.keys(data).length) setNodeData(id, data);
			};
			const toRun: string[] = [];
			let added = 0;
			for (const op of ops) {
				if (op.op === "add_node") {
					const id = addNodeAt(op.kind, { x: 220 + added * 340, y: 180 });
					added += 1;
					idMap.set(op.id, id);
					kindOf.set(id, op.kind);
					setFields(id, op);
				} else if (op.op === "update_node") {
					setFields(resolve(op.id), op);
				} else if (op.op === "connect") {
					const s = resolve(op.source);
					const t = resolve(op.target);
					const sk = kindOf.get(s);
					const tk = kindOf.get(t);
					const handle =
						sk && tk
							? resolveTargetHandle(sk as NodeKind, tk as NodeKind)
							: null;
					if (handle) connectNodes(s, null, t, handle);
				} else if (op.op === "delete_node") {
					removeNode(resolve(op.id));
				} else if (op.op === "run_node") {
					toRun.push(op.id);
				}
			}
			// Defer runs so freshly-added nodes are committed + saved before running.
			if (toRun.length) {
				const ids = toRun.map(resolve);
				setTimeout(() => {
					for (const id of ids) runNode(id);
				}, 250);
			}
		},
		[addNodeAt, connectNodes, removeNode, setNodeData, runNode],
	);

	const assistant = useAssistantChat(
		projectId,
		getAssistantNodes,
		applyAssistantOps,
	);

	const queryClient = useQueryClient();
	useAutoDetachEmptyText(nodes, edges, removeEdge);
	const rf = useRef<ReactFlowInstance | null>(null);
	const [picker, setPicker] = useState<DropPicker | null>(null);
	const [menu, setMenu] = useState<{
		x: number;
		y: number;
		flow: { x: number; y: number };
	} | null>(null);
	const [nodeMenu, setNodeMenu] = useState<{
		x: number;
		y: number;
		nodeId: string;
		locked: boolean;
	} | null>(null);
	const [tool, setTool] = useState<CanvasTool>("hand");

	// Debounced autosave of the graph when a project is loaded.
	const [, setSaveState] = useState<SaveState>("idle");
	const firstRun = useRef(true);
	const pendingGraph = useRef<ReturnType<typeof serializeGraph> | null>(null);
	useEffect(() => {
		if (!projectId) return;
		if (firstRun.current) {
			firstRun.current = false;
			return;
		}
		setSaveState("saving");
		const graph = serializeGraph(nodes, edges);
		pendingGraph.current = graph;
		const timer = setTimeout(() => {
			updateWorkflow(projectId, { graph })
				.then(() => {
					pendingGraph.current = null;
					setSaveState("saved");
				})
				.catch(() => setSaveState("idle"));
		}, 800);
		return () => clearTimeout(timer);
	}, [nodes, edges, projectId]);

	// Flush a pending graph on unmount so switching to the Video tab keeps the latest edits.
	useEffect(() => {
		return () => {
			if (projectId && pendingGraph.current)
				updateWorkflow(projectId, { graph: pendingGraph.current }).catch(
					() => {},
				);
		};
	}, [projectId]);

	// Enforce per-input-handle max connections at the connection-validation layer
	// (so handles stay connectable and keep their hover behaviour).
	const isValidConnection = useCallback<IsValidConnection>(
		(conn) => {
			if (!conn.source || !conn.target) return true;
			const source = nodes.find((n) => n.id === conn.source);
			const target = nodes.find((n) => n.id === conn.target);
			if (!source?.type || !target?.type) return true;
			// Reject type-incompatible connections; allow reroutable ones (onConnect
			// switches them to the correct handle).
			const handle = resolveTargetHandle(
				source.type as NodeKind,
				target.type as NodeKind,
				conn.targetHandle,
			);
			if (!handle) return false;
			const port = NODE_CONFIG[target.type as NodeKind]?.inputs.find(
				(p) => p.id === handle,
			) as Port | undefined;
			const max = port?.max ?? 1;
			const current = edges.filter(
				(e) => e.target === conn.target && e.targetHandle === handle,
			).length;
			return current < max;
		},
		[nodes, edges],
	);

	const onPaneContextMenu = useCallback(
		(event: MouseEvent | React.MouseEvent) => {
			event.preventDefault();
			if (!rf.current) return;
			const flow = rf.current.screenToFlowPosition({
				x: event.clientX,
				y: event.clientY,
			});
			setMenu({ x: event.clientX, y: event.clientY, flow });
		},
		[],
	);

	const onNodeContextMenu = useCallback(
		(event: React.MouseEvent, node: Node) => {
			event.preventDefault();
			setNodeMenu({
				x: event.clientX,
				y: event.clientY,
				nodeId: node.id,
				locked: Boolean((node.data as { locked?: boolean })?.locked),
			});
		},
		[],
	);

	const onConnectEnd = useCallback<OnConnectEnd>((event, connectionState) => {
		if (connectionState.isValid || !connectionState.fromNode || !rf.current)
			return;
		const point = "clientX" in event ? event : event.changedTouches[0];
		const flow = rf.current.screenToFlowPosition({
			x: point.clientX,
			y: point.clientY,
		});
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

	const handleAddSticker = useCallback(
		(variant: string) => {
			const flow = rf.current
				? rf.current.screenToFlowPosition({
						x: window.innerWidth / 2,
						y: window.innerHeight / 2,
					})
				: { x: 0, y: 0 };
			addSticker(variant, flow);
		},
		[addSticker],
	);

	// Upload a media file → drop it on the canvas as a source node whose output is
	// the uploaded asset (stored by key; re-presigned for display and downstream).
	const handleUpload = useCallback(
		async (file: File) => {
			const flow = rf.current
				? rf.current.screenToFlowPosition({
						x: window.innerWidth / 2,
						y: window.innerHeight / 2,
					})
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
			setNodeData(id, {
				label: file.name,
				upload: { name: file.name, progress: 0 },
			});
			try {
				const { key, url, name } = await uploadAsset(file, (progress) =>
					setNodeData(id, { upload: { name: file.name, progress } }),
				);
				setNodeData(id, {
					upload_key: key,
					upload_name: name,
					upload: undefined,
				});
				execution.seedOutputs({ [id]: url });
			} catch (err) {
				removeNode(id);
				alert(err instanceof Error ? err.message : "Upload failed");
			}
		},
		[addNodeAt, setNodeData, removeNode, execution.seedOutputs],
	);

	// Credits and assets change during a run — refresh both when it settles,
	// so the generations panel shows new outputs without a page reload.
	useEffect(() => {
		if (execution.status === "completed" || execution.status === "failed") {
			queryClient.invalidateQueries({ queryKey: ["balance"] });
			queryClient.invalidateQueries({ queryKey: ["assets"] });
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
		<ReactFlowProvider>
			<CanvasActionsProvider value={actions}>
				<ExecutionStatusProvider
					value={{
						statuses: execution.nodeStatuses,
						outputs: execution.nodeOutputs,
						seedOutputs: execution.seedOutputs,
					}}
				>
					<div className="flex h-full w-full flex-col gap-2 p-2">
						<div
							className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border"
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
							<FlowCanvas
								nodes={nodes}
								edges={edges}
								onNodesChange={onNodesChange}
								onEdgesChange={onEdgesChange}
								onConnect={onConnect}
								onConnectEnd={onConnectEnd}
								onPaneContextMenu={onPaneContextMenu}
								onNodeContextMenu={onNodeContextMenu}
								isValidConnection={isValidConnection}
								tool={tool}
								onInit={(instance) => {
									rf.current = instance;
								}}
							/>

							<CanvasControls
								tool={tool}
								onToolChange={setTool}
								onUndo={() => {}}
								onRedo={() => {}}
								onFitView={() =>
									rf.current?.fitView({ maxZoom: 0.85, duration: 300 })
								}
							/>

							<CanvasToolbar
								onAddNode={addNode}
								onUpload={handleUpload}
								onAddSticker={handleAddSticker}
							/>

							{nodes.length === 0 ? (
								<div className="pointer-events-none absolute inset-0 z-[5]">
									<CanvasEmptyState onAddNode={addNode} />
								</div>
							) : null}

							{!open ? (
								<div className="absolute bottom-4 right-4 z-10">
									<AssistantButton onClick={openAssistant} />
								</div>
							) : (
								<div className="absolute bottom-4 right-4 top-4 z-20 w-96">
									<AssistantPanel
										onClose={closeAssistant}
										messages={assistant.messages}
										loading={assistant.loading}
										onSend={assistant.send}
										onNewThread={assistant.newThread}
										threads={assistant.threads}
										activeThreadId={assistant.threadId}
										onOpenThread={assistant.openThread}
										onDeleteThread={assistant.deleteThread}
									/>
								</div>
							)}

							{picker ? (
								<>
									<div
										className="fixed inset-0 z-40"
										onClick={() => setPicker(null)}
									/>
									<div
										className="fixed z-50"
										style={{ left: picker.x, top: picker.y }}
									>
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

							{nodeMenu ? (
								<NodeContextMenu
									x={nodeMenu.x}
									y={nodeMenu.y}
									locked={nodeMenu.locked}
									onRun={() => runNode(nodeMenu.nodeId)}
									onDuplicate={() => duplicateNode(nodeMenu.nodeId)}
									onCopy={() => copyNode(nodeMenu.nodeId)}
									onPaste={() => pasteNode()}
									onBringToFront={() => bringToFront(nodeMenu.nodeId)}
									onToggleLock={() => toggleLock(nodeMenu.nodeId)}
									onDelete={() => removeNode(nodeMenu.nodeId)}
									onClose={() => setNodeMenu(null)}
								/>
							) : null}
						</div>

						{/* mode tabs: floating bar below the canvas card */}
						<EditorModeTabs projectId={projectId ?? null} mode="canvas" className="shrink-0 overflow-hidden rounded-lg border border-border" />
					</div>
				</ExecutionStatusProvider>
			</CanvasActionsProvider>
		</ReactFlowProvider>
	);
}
