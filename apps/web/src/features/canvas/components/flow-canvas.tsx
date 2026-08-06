"use client";

import {
  Background,
  BackgroundVariant,
  type Connection,
  ConnectionLineType,
  type Edge,
  type EdgeTypes,
  type IsValidConnection,
  type Node,
  type NodeTypes,
  type OnConnectEnd,
  type OnEdgesChange,
  type OnNodesChange,
  ReactFlow,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AudioNode } from "./nodes/audio-node";
import { StickerNode } from "./nodes/sticker-node";
import { CustomEdge } from "./toolbar/custom-edge";
import type { CanvasTool } from "./toolbar/canvas-controls";
import { ImageNode } from "./nodes/image-node";
import { TextNode } from "./nodes/text-node";
import { VideoNode } from "./nodes/video-node";
import { WorldNode } from "./nodes/world-node";

const nodeTypes: NodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
  world: WorldNode,
  sticker: StickerNode,
};
const edgeTypes: EdgeTypes = { custom: CustomEdge };
const defaultEdgeOptions = { type: "custom" };

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onConnectEnd?: OnConnectEnd;
  onInit?: (instance: ReactFlowInstance) => void;
  onPaneContextMenu?: (event: MouseEvent | React.MouseEvent) => void;
  onNodeContextMenu?: (event: React.MouseEvent, node: Node) => void;
  isValidConnection?: IsValidConnection;
  tool: CanvasTool;
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectEnd,
  onInit,
  onPaneContextMenu,
  onNodeContextMenu,
  isValidConnection,
  tool,
}: FlowCanvasProps) {
  const isHand = tool === "hand";
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onConnectEnd={onConnectEnd}
      onInit={onInit}
      onPaneContextMenu={onPaneContextMenu}
      onNodeContextMenu={onNodeContextMenu}
      isValidConnection={isValidConnection}
      panOnDrag={isHand ? true : [1, 2]}
      selectionOnDrag={!isHand}
      connectionLineType={ConnectionLineType.SmoothStep}
      connectionLineStyle={{ stroke: "rgba(138,138,138,0.5)", strokeWidth: 2 }}
      defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
      minZoom={0.1}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
      className="!bg-transparent"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.06)" />
    </ReactFlow>
  );
}
