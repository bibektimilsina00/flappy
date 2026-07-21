from apps.api.app.node_system.base import Node, NodeIO, NodeMetadata
from apps.api.app.node_system.context import NodeContext


class UploadNode(Node):
    metadata = NodeMetadata(
        type="upload",
        title="Upload Asset",
        category="output",
        inputs=[NodeIO("file", "video")],
        outputs=[NodeIO("url", "text")],
    )

    async def execute(self, inputs: dict, ctx: NodeContext) -> dict:
        # ponytail: push inputs["file"] to ctx.storage and return its public URL.
        raise NotImplementedError("Storage upload not wired yet")
