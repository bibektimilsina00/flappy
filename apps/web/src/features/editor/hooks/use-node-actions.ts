import type { NodeAction } from "../constants";
import { useEditorActions } from "../editor-actions";

// Dispatch for the common recommended-actions. Per-type components can wrap
// or extend this as their behaviours diverge.
export function useNodeActions(id: string) {
  const { addConnectedNode, setNodeData } = useEditorActions();

  return (action: NodeAction) => {
    if (action.action === "add-video") addConnectedNode(id, "video");
    else if (action.action === "write") setNodeData(id, { mode: "text" });
  };
}
