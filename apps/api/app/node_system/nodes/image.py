from apps.api.app.node_system.base import Node, NodeIO, NodeMetadata
from apps.api.app.node_system.context import NodeContext


class ImageNode(Node):
    metadata = NodeMetadata(
        type="image",
        title="Image Generate",
        category="generate",
        inputs=[NodeIO("prompt", "text")],
        outputs=[NodeIO("image", "image")],
    )

    async def execute(self, inputs: dict, ctx: NodeContext) -> dict:
        # ponytail: wire a provider (fal/replicate) here; return the asset ref.
        raise NotImplementedError("Image generation provider not wired yet")
