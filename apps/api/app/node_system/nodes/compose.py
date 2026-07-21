from apps.api.app.node_system.base import Node, NodeIO, NodeMetadata
from apps.api.app.node_system.context import NodeContext


class ComposeNode(Node):
    metadata = NodeMetadata(
        type="compose",
        title="Compose (FFmpeg)",
        category="process",
        inputs=[
            NodeIO("video", "video"),
            NodeIO("audio", "audio"),
        ],
        outputs=[NodeIO("video", "video")],
    )

    async def execute(self, inputs: dict, ctx: NodeContext) -> dict:
        # ponytail: shell out to ffmpeg here; mux video+audio, upload result.
        raise NotImplementedError("FFmpeg compose not wired yet")
