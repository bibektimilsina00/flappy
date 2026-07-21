from apps.api.app.node_system.base import Node, NodeIO, NodeMetadata
from apps.api.app.node_system.context import NodeContext


class TextNode(Node):
    metadata = NodeMetadata(
        type="text",
        title="Text / Prompt",
        category="input",
        inputs=[],
        outputs=[NodeIO("text", "text")],
    )

    async def execute(self, inputs: dict, ctx: NodeContext) -> dict:
        # Passthrough: the prompt text is configured on the node itself.
        return {"text": inputs.get("text", "")}
