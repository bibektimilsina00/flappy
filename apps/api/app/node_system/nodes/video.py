from apps.api.app.node_system.base import Node, NodeIO, NodeMetadata
from apps.api.app.node_system.context import NodeContext


class VideoNode(Node):
    metadata = NodeMetadata(
        type="video",
        title="Video Generate",
        category="generate",
        inputs=[NodeIO("prompt", "text"), NodeIO("image", "image")],
        outputs=[NodeIO("video", "video")],
    )

    async def execute(self, inputs: dict, ctx: NodeContext) -> dict:
        # ponytail: wire a provider (fal/replicate) here; return the asset ref.
        raise NotImplementedError("Video generation provider not wired yet")
