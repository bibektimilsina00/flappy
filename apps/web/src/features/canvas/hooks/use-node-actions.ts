import type { NodeAction } from "../lib/constants";
import { useCanvasActions } from "../components/canvas-actions";

// Dispatch for the common recommended-actions. Per-type components can wrap
// or extend this as their behaviours diverge.
export function useNodeActions(id: string) {
  const { addConnectedNode, addInputNode, setNodeData } = useCanvasActions();

  return (action: NodeAction) => {
    if (action.action === "add-video") addConnectedNode(id, "video");
    else if (action.action === "write") setNodeData(id, { mode: "text" });
    else if (action.action === "image-edit")
      // Add an upload-image node to the left, feeding this node's image input.
      addInputNode(id, "image", "image", { uploader: true, label: "Upload image" });
    else if (action.action === "image-to-video")
      addInputNode(id, "image", "image", { uploader: true, label: "Upload image" });
    else if (action.action === "video-edit")
      addInputNode(id, "video", "video", { uploader: true, label: "Upload video" });
    else if (action.action === "video-extend")
      // Extend forward: a new video node fed by this video's output.
      addConnectedNode(id, "video");
  };
}
